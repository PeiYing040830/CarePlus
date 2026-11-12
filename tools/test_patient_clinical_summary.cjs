const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const dom=new JSDOM('',{url:'http://127.0.0.1:8080/doctor/patients.html',runScripts:'outside-only'}),w=dom.window;
w.Date.now=()=>Date.parse('2026-11-13T04:00:00Z');
for(const file of ['php-view-runtime','context','views'])w.eval(read('original-design/'+file+'.js'));
const state={profile:{role:'doctor',legacy_user_id:10},user:{},directory:[],tables:{doctors:[{doctor_id:1,user_id:10}],patients:[{patient_id:1,first_name:'Synthetic',last_name:'Patient',allergies:'Synthetic allergy'},{patient_id:2,first_name:'No',last_name:'History'}],medical_records:[
 {record_id:5,patient_id:1,doctor_id:1,visit_date:'2026-03-16',diagnosis:'Older diagnosis',prescription:'Older text'},
 {record_id:7,patient_id:'1',doctor_id:'1',visit_date:'2026-03-16',diagnosis:'Latest <text>',prescription:'Latest treatment text'},
 {record_id:9,patient_id:1,doctor_id:2,visit_date:'2026-11-12',diagnosis:'Other doctor'},
 {record_id:10,patient_id:1,doctor_id:1,visit_date:'2026-12-01',diagnosis:'Future record'}
]}};
const context=w.CarePlusOriginalContext(state,'doctor/patients.html');
assert.equal(context.patients[0].last_diagnosis,'Latest <text>');assert.equal(context.patients[0].last_prescription,'Latest treatment text');assert.equal(context.patients[0].medical_conditions,'Synthetic allergy');
w.document.body.innerHTML=w.CarePlusOriginalViews['doctor/patients.html'](context,w.CarePlusViewPHP);w.eval(read('doctor/patients.js'));
w.viewPatientDetails(1);assert.equal(w.document.getElementById('modalDiagnosis').textContent,'Latest <text>');assert.equal(w.document.getElementById('modalPrescription').textContent,'Latest treatment text');assert.equal(w.document.querySelector('#modalDiagnosis text'),null);
w.viewPatientDetails(2);assert.equal(w.document.getElementById('modalDiagnosis').textContent,'No diagnosis recorded');
dom.window.close();console.log('Passed: actual patient detail modal displays latest authorized diagnosis/treatment, same-day order, escaped text and empty-history fallback.');
