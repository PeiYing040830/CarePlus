const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const code=fs.readFileSync(path.join(root,'portal.js'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
(async()=>{
 for(const role of ['patient','doctor','admin']) {
  const dom=new JSDOM(fs.readFileSync(path.join(root,role+'.html'),'utf8'),{url:'https://example.test/CarePlus/'+role+'.html',runScripts:'outside-only'});
  const w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.print=()=>{};
  const errors=[];w.addEventListener('error',e=>errors.push(e.error));
  const calls=[];const fixtures={
   appointments:[{appointment_id:1,patient_id:1,doctor_id:1,appointment_date:'2026-11-02',appointment_time:'09:00:00',status:'confirmed',payment_status:'unpaid',reason:'<img src=x onerror=alert(1)>',qr_code:'test'}],
   patients:[{patient_id:1,user_id:1,first_name:'Test',last_name:'Patient',phone:''}],
   medical_records:[{record_id:1,patient_id:1,doctor_id:1,diagnosis:'Synthetic'}],
   prescriptions:[{prescription_id:1,patient_id:1,doctor_id:1,medications_json:[{name:'Synthetic'}]}],
   payments:[],notifications:[{notification_id:1,title:'Test',message:'Synthetic notification',is_read:0}],
   users:[{user_id:1,email:'test@example.test',user_type:'patient',status:'active'},{user_id:2,email:'other@example.test',user_type:'patient',status:'active'}],
   contact_submissions:[],clinic_catalog:[],symptom_checks:[],reviews:[]
  };
  const client={
   from:name=>({select:()=>({order:()=>({limit:async()=>({data:fixtures[name]||[],error:null})})})}),
   rpc:async(name,args)=>{
    calls.push([name,args]);
    if(name==='careplus_doctors')return{data:[{doctor_id:1,name:'Test Doctor',specialization:'General Practice'}]};
    if(name==='careplus_slots')return{data:[{slot:'10:00:00',available:true}]};
    return{data:{ok:true,response:'Test reply'}};
   }
  };
  w.eval(code);w.dispatchEvent(new w.CustomEvent('careplus-ready',{detail:{client,user:{id:'test-uuid',email:'test@example.test'},profile:{role,legacy_user_id:1,display_name:'Test'}}}));
  await tick();
  assert(w.document.querySelectorAll('[data-tab]').length>=9);
  for(const nav of w.document.querySelectorAll('[data-tab]')){nav.click();await tick();assert(w.document.getElementById('module-title').textContent);}
  w.document.querySelector('[data-tab="appointments"]').click();await tick();
  assert.equal(w.document.querySelector('#module-data img'),null,'Database strings must not create HTML');
  assert(w.document.getElementById('module-data').textContent.includes('<img src=x'));
  if(role==='patient') {
   const form=w.document.querySelector('#module-form form');form.elements.date.value='2026-11-02';form.elements.date.dispatchEvent(new w.Event('change'));await tick();
   assert.equal(form.elements.time.options.length,2);form.elements.time.value='10:00:00';form.elements.reason.value='Test booking';
   form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
   assert(calls.some(([n,a])=>n==='careplus_action'&&a.p_action==='book'&&a.p_data.reason==='Test booking'));
  }
  assert.deepEqual(errors,[]);dom.window.close();
 }
 console.log('Passed: all three portal navigations, live table rendering, booking form/slots, safe text rendering and no browser script errors (DOM simulation).');
})().catch(error=>{console.error(error);process.exitCode=1;});
