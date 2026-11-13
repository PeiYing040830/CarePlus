const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const dom=new JSDOM('',{url:'http://localhost/patient/appointment.html',runScripts:'outside-only'}),w=dom.window;
for(const f of ['php-view-runtime','context'])w.eval(fs.readFileSync(path.join(__dirname,'../original-design/'+f+'.js'),'utf8'));
const state={profile:{role:'patient'},user:{},directory:[],historicalDoctors:[{doctor_id:9,first_name:'Historical',last_name:'Doctor',phone:'0123456789',profile_picture:'https://example.test/signed.png',status:'on_leave',specialization:'General'}],tables:{appointments:[{appointment_id:1,doctor_id:9,patient_id:1}],medical_records:[{record_id:1,doctor_id:9,patient_id:1}],prescriptions:[{prescription_id:1,doctor_id:9,patient_id:1,medications_json:[]}]}};
let c=w.CarePlusOriginalContext(state,'patient/appointment.html');
for(const r of [c.appointments[0],c.medicalRecords[0],c.prescriptions[0]]){assert.equal(r.doctor_name,'Historical Doctor');assert.equal(r.doctor_profile_picture,'https://example.test/signed.png');assert.equal(r.doctor_phone,'0123456789');}
assert.equal(c.doctors.length,0);assert.equal(c.availableDoctors.length,0);
state.directory=[{doctor_id:9,name:'Old directory name',profile_picture:null}];c=w.CarePlusOriginalContext(state,'patient/prescription.html');assert.equal(c.prescriptions[0].doctor_name,'Historical Doctor');
dom.window.close();console.log('Passed: historical appointment, record and prescription retain doctor identity/photo independently of booking directory.');
