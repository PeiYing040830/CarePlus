const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM('',{url:'http://127.0.0.1:8080/doctor/patients.html',runScripts:'outside-only'}),w=dom.window;
w.Date.now=()=>Date.parse('2026-11-13T04:00:00Z');
for(const file of ['php-view-runtime','context','views'])w.eval(fs.readFileSync(path.join(root,'original-design/'+file+'.js'),'utf8'));
const appointments=[
 {patient_id:1,doctor_id:1,status:'completed',appointment_date:'2026-03-16'},
 {patient_id:'1',doctor_id:'1',status:'completed',appointment_date:'2026-11-12'},
 {patient_id:1,doctor_id:1,status:'pending',appointment_date:'2026-11-20'},
 {patient_id:1,doctor_id:1,status:'cancelled',appointment_date:'2026-11-10'},
 {patient_id:1,doctor_id:2,status:'completed',appointment_date:'2026-11-13'},
 {patient_id:1,doctor_id:1,status:'completed',appointment_date:'2026-12-01'},
 {patient_id:2,doctor_id:1,status:'confirmed',appointment_date:'2026-11-20'}
];
const state={profile:{role:'doctor',legacy_user_id:10},user:{},directory:[],tables:{doctors:[{doctor_id:1,user_id:10}],patients:[{patient_id:1,first_name:'Synthetic',last_name:'Visited'},{patient_id:2,first_name:'Synthetic',last_name:'Upcoming'}],appointments}};
const c=w.CarePlusOriginalContext(state,'doctor/patients.html');
assert.equal(c.patients[0].total_visits,2);assert.equal(c.patients[0].last_visit,'2026-11-12');assert.equal(c.patients[1].total_visits,0);assert.equal(c.patients[1].last_visit,null);assert.equal(c.totalVisits,2);
const page=new JSDOM(w.CarePlusOriginalViews['doctor/patients.html'](c,w.CarePlusViewPHP));
const card=page.window.document.querySelector('[data-patient-id="1"]');assert.equal(card.dataset.lastVisit,'2026-11-12');assert(card.textContent.includes('Nov 12, 2026'));assert(!card.textContent.includes('Never'));
const upcoming=page.window.document.querySelector('[data-patient-id="2"]');assert(upcoming.textContent.includes('Never'));
page.window.close();dom.window.close();console.log('Passed: scoped completed-visit counts, latest past visit, future/cancelled/uncompleted exclusion, string IDs and Never only without completed visits.');
