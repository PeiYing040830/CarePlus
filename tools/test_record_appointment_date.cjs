const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('../../.careplus-test-tools/node_modules/jsdom');
(async()=>{
 const dom=new JSDOM('<form id="recordForm"><input name="record_id"><div><select name="patient_id"><option value="1">Patient One</option><option value="2">Patient Two</option></select></div><input name="visit_date" type="date" value="2026-11-13"></form>',{url:'http://127.0.0.1:8080/doctor/medicalRecords.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window;
 await new Promise(r=>setTimeout(r,0));
 w.CarePlusOriginalData={page:'doctor/medicalRecords.html',profile:{role:'doctor'},client:{}};
 w.CarePlusOriginalContext=()=>({appointments:[{appointment_id:10,patient_id:1,status:'completed',appointment_date:'2026-03-16'},{appointment_id:11,patient_id:1,status:'confirmed',appointment_date:'2026-11-20'},{appointment_id:20,patient_id:2,status:'completed',appointment_date:'2026-04-02'}]});
 w.fetch=async()=>{};w.eval(fs.readFileSync(path.join(__dirname,'../original-design/bridge.js'),'utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const form=w.document.querySelector('form'),select=form.elements.appointment_id,date=form.elements.visit_date;
 select.value='10';select.dispatchEvent(new w.Event('change'));assert.equal(date.value,'2026-03-16');
 select.value='11';select.dispatchEvent(new w.Event('change'));assert.equal(date.value,'2026-11-20');
 form.elements.patient_id.value='2';form.elements.patient_id.dispatchEvent(new w.Event('change'));assert.equal(select.value,'20');assert.equal(date.value,'2026-04-02');
 form.elements.record_id.value='99';date.value='2026-04-01';select.dispatchEvent(new w.Event('change'));assert.equal(date.value,'2026-04-01','Editing a record must retain its original visit identity');
 dom.window.close();console.log('Passed: new medical-record visit date follows the selected appointment, patient changes and existing record dates are preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
