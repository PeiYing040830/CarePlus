const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM('',{url:'http://127.0.0.1:8080/doctor/medicalRecords.html',runScripts:'outside-only'}),w=dom.window;
for(const file of ['php-view-runtime','context','views'])w.eval(fs.readFileSync(path.join(root,'original-design/'+file+'.js'),'utf8'));
const state={profile:{role:'doctor',legacy_user_id:10},user:{},directory:[],tables:{doctors:[{doctor_id:1,user_id:10}],patients:[{patient_id:1,first_name:'Synthetic',last_name:'One'},{patient_id:2,first_name:'Synthetic',last_name:'Two'}],medical_records:[
 {record_id:1,doctor_id:1,patient_id:1,visit_date:'2026-03-16',diagnosis:'Matching diagnosis'},
 {record_id:2,doctor_id:1,patient_id:1,visit_date:'2026-03-17',diagnosis:'Other date'},
 {record_id:3,doctor_id:1,patient_id:2,visit_date:'2026-03-16',diagnosis:'Other patient'}
]}};
const context=()=>w.CarePlusOriginalContext(state,'doctor/medicalRecords.html');
w.history.replaceState({},'','?date=2026-03-16&patient_id=1&search=Matching');
let c=context();assert.equal(c.filterDate,'2026-03-16');assert.equal(c.filterPatient,'1');assert.deepEqual(Array.from(c.medicalRecords,r=>r.record_id),[1]);assert.equal(c.allRecords.length,1);assert.equal(c.stats.total_records,3);
let page=new JSDOM(w.CarePlusOriginalViews['doctor/medicalRecords.html'](c,w.CarePlusViewPHP));assert.equal(page.window.document.getElementById('filterDate').value,'2026-03-16');assert.equal(page.window.document.querySelectorAll('.record-card').length,1);assert.equal(page.window.document.querySelector('.record-card').dataset.recordId,'1');page.window.close();
w.history.replaceState({},'','?date=2026-01-01');c=context();assert.equal(c.medicalRecords.length,0);page=new JSDOM(w.CarePlusOriginalViews['doctor/medicalRecords.html'](c,w.CarePlusViewPHP));assert(page.window.document.body.textContent.includes('Try adjusting your search or filters'));page.window.close();
w.history.replaceState({},'','/doctor/medicalRecords.html');assert.equal(context().medicalRecords.length,3);
dom.window.close();console.log('Passed: actual medical-record page applies combined date/patient/search filters, retains selected date, shows empty results and restores records when cleared.');
