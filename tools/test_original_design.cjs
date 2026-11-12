const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const dom=new JSDOM('',{url:'https://example.test/CarePlus/index.html',runScripts:'outside-only'}),w=dom.window;
for(const file of ['php-view-runtime','context','views'])w.eval(read('original-design/'+file+'.js'));
w.CarePlusOriginalBase='https://example.test/CarePlus/';
const manifest=JSON.parse(read('original-design/manifest.json'));
const age=w.CarePlusViewPHP.ageParts;
const php=w.CarePlusViewPHP;
const today=php.call('date_create',['today'],{});
assert(today>0,'PHP today must not resolve to the Unix epoch');
assert.equal(php.date('Y-m-d',today),php.date('Y-m-d'));
assert.equal(php.call('date_diff',[php.timestamp('2000-08-30'),today],{}).y,age('2000-08-30').years);
assert.equal(php.call('date_diff',[php.timestamp('2000-08-30'),php.timestamp('2026-08-29')],{}).y,25);
assert.deepEqual(JSON.parse(JSON.stringify(age('2000-08-30','2026-11-13'))),{years:26,months:2,days:14,total_days:9571});
assert.equal(age('2000-08-30','2026-08-29').years,25);
assert.equal(age('2000-08-30','2026-08-30').years,26);
assert.equal(age('2000-02-29','2024-02-29').years,24);
assert.equal(age('not-a-date').years,0);
assert.equal(age('2026-02-30').years,0);
const profileData={tables:{users:[{user_id:1}],patients:[{patient_id:1,user_id:1,first_name:'Test',last_name:'Patient',date_of_birth:'2000-08-30'}]},directory:[],profile:{role:'patient',legacy_user_id:1},user:{}};
const profileContext=w.CarePlusOriginalContext(profileData,'patient/profile.html');
const profileDoc=new JSDOM(w.CarePlusOriginalViews['patient/profile.html'](profileContext,w.CarePlusViewPHP)).window;
assert(profileDoc.document.querySelector('.age-badge').textContent.includes(`${profileContext.age.years} years, ${profileContext.age.months} months, ${profileContext.age.days} days`));
profileDoc.close();
const tables={users:[{user_id:1,status:'active'}],patients:[{patient_id:1,user_id:1,first_name:'Test',last_name:'Patient'}],doctors:[{doctor_id:1,user_id:2,first_name:'Test',last_name:'Doctor',available_days:['Monday'],available_hours:'09:00-17:00'}],appointments:[{appointment_id:1,patient_id:1,doctor_id:1,appointment_date:'2026-11-13',appointment_time:'09:00:00',status:'confirmed',reason:'<img src=x onerror=alert(1)>'}],medical_records:[{record_id:1,appointment_id:1,patient_id:1,doctor_id:1,visit_date:'2026-11-13',diagnosis:'Test'}],prescriptions:[{prescription_id:1,appointment_id:1,patient_id:1,doctor_id:1,medications_json:[{name:'Test'}],status:'active'}],payments:[],notifications:[]};
for(const populated of [false,true])for(const [page,view] of Object.entries(w.CarePlusOriginalViews)){
 const data={tables:populated?tables:{},directory:populated?[{doctor_id:1,name:'Test Doctor',available_days:['Monday']}]:[],profile:{role:page.includes('/')?page.split('/')[0]:'guest',legacy_user_id:1,display_name:'Test'},user:{id:'test-uuid',email:'test@example.test'}};
 const html=view(w.CarePlusOriginalContext(data,page),w.CarePlusViewPHP).replace(/\.php\b/g,'.html');
 const doc=new JSDOM(html,{url:'https://example.test/CarePlus/'+page}).window.document;
 if(/^(patient|doctor|admin)\//.test(page)&&doc.querySelector('.navbar')){
  const nav=doc.querySelector('.header > .navbar');assert(nav,page+' preserves the header wrapper');
  assert(nav.querySelector(':scope > .logo'),page+' has left title');
  assert(nav.querySelector(':scope > .mobile-menu-toggle'),page+' has right menu');
  assert(doc.querySelector('link[href="../original-design/header-layout.css"]'),page+' loads shared header layout');
 }
 assert(doc.body,page+' has body');assert(!html.includes('<?php'),page+' contains no PHP');
 for(const node of doc.querySelectorAll('script[src],link[rel="stylesheet"]')){
  const url=new URL(node.src||node.href);if(url.origin!=='https://example.test')continue;
  const file=decodeURIComponent(url.pathname.slice('/CarePlus/'.length));assert(fs.existsSync(path.join(root,file)),page+': missing '+file);
 }
 for(const script of doc.querySelectorAll('script:not([src])'))new Function(script.textContent);
 if(manifest[page].css){const original=path.resolve(root,'..',manifest[page].css);if(fs.existsSync(original))assert.equal(read(manifest[page].css).replace(/[\t ]+$/gm,''),fs.readFileSync(original,'utf8').replace(/[\t ]+$/gm,''),page+' preserves original CSS');}
 doc.defaultView.close();
}
(async()=>{
 const photoUrl='https://example.test/storage/v1/object/sign/careplus-uploads/test/photo.png?token=test';
 const directory=[{doctor_id:1,name:'Test Doctor'}],photoTables={doctors:[{doctor_id:1,profile_picture:'test/photo.png'}]};
 w.eval(read('original-design/photos.js'));
 await w.CarePlusDoctorPhotos({rpc:async()=>({data:[{doctor_id:1,profile_picture:'test/photo.png'}]}),storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:photoUrl}})})}},directory,photoTables);
 assert.equal(directory[0].profile_picture,photoUrl);assert.equal(photoTables.doctors[0].profile_picture,photoUrl);
 for(const page of ['doctors.html','patient/doctors.html','patient/appointment.html','patient/dashboard.html']){
  const c=w.CarePlusOriginalContext({tables:photoTables,directory,profile:{role:'patient'},user:{}},page);
  assert(w.CarePlusOriginalViews[page](c,w.CarePlusViewPHP).includes('src="'+photoUrl+'"'),page+' preserves signed image URL');
 }
 const calls=[];w.Response=Response;w.fetch=async()=>({native:true});
 w.CarePlusOriginalData={tables,directory:[],page:'patient/appointment.html',base:w.CarePlusOriginalBase,profile:{role:'patient',legacy_user_id:1},user:{id:'test-uuid'},client:{rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='careplus_slots'?[{slot:'09:00:00',available:true},{slot:'09:30:00',available:false}]:{id:2}};}}};
 w.eval(read('original-design/bridge.js'));
 const post=async(action,data={})=>(await w.fetch('appointment.html',{method:'POST',body:JSON.stringify({action,...data})})).json();
 const slots=await post('get_slots',{doctor_id:1,date:'2026-11-13'});assert.equal(slots.slot_times.length,1);assert.equal(slots.slot_times[0],'09:00:00');
 const book=await post('book_appointment',{doctor_id:1,appointment_date:'2026-11-13',appointment_time:'09:00:00',reason:'Test'});assert(book.success);
 assert(calls.some(([n,a])=>n==='careplus_action'&&a.p_action==='book'&&a.p_data.date==='2026-11-13'&&a.p_data.time==='09:00:00'));
 const record=await post('view_record',{record_id:1});assert.equal(record.record.diagnosis,'Test');
 // Render the actual prescription modal: signed URLs must not receive ../.
 w.CarePlusOriginalData.directory=[{doctor_id:1,name:'Test Doctor',phone:'0123456789',profile_picture:photoUrl}];
 tables.doctors[0].profile_picture=photoUrl;
 w.document.body.innerHTML='<div id="prescriptionModal"><div id="modalBody"></div></div>';
 w.eval(read('patient/prescription.js'));
 await w.viewPrescriptionDetails(1);
 assert.equal(w.document.querySelector('.doctor-modal-image').getAttribute('src'),photoUrl);
 assert(w.document.getElementById('modalBody').textContent.includes('0123456789'),'Prescribing doctor phone appears in modal');
 w.CarePlusOriginalData.client.rpc=async()=>({error:{message:'Permission denied.'}});
 const denied=await post('cancel_appointment',{appointment_id:1});assert.equal(denied.success,false);assert.equal(denied.message,'Permission denied.');
 w.CarePlusOriginalData.client.auth={signInWithPassword:async()=>({error:{message:'Invalid credentials.'}})};
 w.document.body.innerHTML='<form id="loginForm" method="post"><input name="email" value="test@example.test"><input name="password" value="incorrect"><button type="submit">Sign in</button></form>';
 w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(w.document.querySelector('[role="status"]').textContent,'Invalid credentials.');assert.equal(w.document.querySelector('button').disabled,false);
 assert.equal((await w.fetch('https://cdn.example.test/library.js')).native,true);
 dom.window.close();console.log('Passed: 41 original views with empty/populated data, original CSS, local assets, inline JS syntax, booking/slot/record adapters.');
})().catch(error=>{console.error(error);process.exitCode=1;});
