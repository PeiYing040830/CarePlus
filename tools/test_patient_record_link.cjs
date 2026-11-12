const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM('',{url:'http://127.0.0.1:8080/patient/medicalRecords.html?record=7',runScripts:'outside-only'}),w=dom.window;
for(const file of ['php-view-runtime','context','views'])w.eval(fs.readFileSync(path.join(root,'original-design/'+file+'.js'),'utf8'));
const state={profile:{role:'patient',legacy_user_id:10},user:{},directory:[],tables:{patients:[{patient_id:1,user_id:10,first_name:'Synthetic',last_name:'Patient'}],doctors:[{doctor_id:2,first_name:'Synthetic',last_name:'Doctor'}],medical_records:[
 {record_id:7,patient_id:1,doctor_id:2,visit_date:'2026-03-16',diagnosis:'Selected <diagnosis>',prescription:'Selected treatment'},
 {record_id:8,patient_id:99,doctor_id:2,visit_date:'2026-03-17',diagnosis:'Other patient'}
]}};
const context=()=>w.CarePlusOriginalContext(state,'patient/medicalRecords.html');
let c=context();assert.equal(c.viewingRecord.record_id,7);assert.equal(c.viewingRecord.appointment_date,'2026-03-16');
const page=new JSDOM(w.CarePlusOriginalViews['patient/medicalRecords.html'](c,w.CarePlusViewPHP));assert(page.window.document.body.textContent.includes('Medical Record #7'));assert(page.window.document.body.textContent.includes('Selected <diagnosis>'));assert(page.window.document.body.textContent.includes('Selected treatment'));assert(page.window.document.body.textContent.includes('March 16, 2026'));assert.equal(page.window.document.querySelector('diagnosis'),null);page.window.close();
for(const query of ['?record=8','?record=999','?record=not-a-number','']){w.history.replaceState({},'', '/patient/medicalRecords.html'+query);assert.equal(context().viewingRecord,null);}
dom.window.close();console.log('Passed: patient record deep link renders selected details and visit date safely; foreign, missing and invalid IDs do not open a record.');
