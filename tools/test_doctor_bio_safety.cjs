const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
(async()=>{
 const dom=new JSDOM('<div id="doctorModal"><div id="modalBody"></div></div>',{url:'http://localhost/patient/doctors.html',runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync(path.join(__dirname,'../original-design/php-view-runtime.js'),'utf8'));
 const text='<img src=x onerror="alert(1)">';
 w.fetch=async()=>({json:async()=>({success:true,doctor:{first_name:'Test',last_name:'Doctor',bio:text,qualifications:text,consultation_fee:10}})});
 w.eval(fs.readFileSync(path.join(__dirname,'../patient/doctors.js'),'utf8'));await w.viewDoctorDetails(1);
 assert.equal(w.document.querySelector('.bio-text').textContent,text);assert.equal(w.document.querySelector('.qualifications-text').textContent,text);assert.equal(w.document.querySelector('#modalBody img[onerror]'),null);
 dom.window.close();console.log('Passed: doctor biography and qualifications render as text, not executable HTML.');
})().catch(e=>{console.error(e);process.exitCode=1;});
