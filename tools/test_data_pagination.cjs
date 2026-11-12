const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('../../.careplus-test-tools/node_modules/jsdom');
(async()=>{
 const dom=new JSDOM('',{url:'http://127.0.0.1:8080/admin/reports.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window;
 const rows=Array.from({length:1205},(_,i)=>({appointment_id:i+1,status:'completed'})),ranges=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic'}}}}),getUser:async()=>({data:{user:{id:'synthetic'}}})},rpc:async name=>({data:name==='careplus_role'?'admin':[]}),from:name=>({select:()=>{
  const query={eq:()=>({single:async()=>({data:{role:'admin',legacy_user_id:1}})}),order:(key,options)=>{assert(key);assert.equal(options.ascending,false);return query;},range:async(start,end)=>{if(name==='appointments')ranges.push([start,end]);return {data:name==='appointments'?rows.slice(start,end+1):[]};}};return query;
 }})};
 Object.defineProperty(w.document,'currentScript',{value:{src:'http://127.0.0.1:8080/original-design/bootstrap.js'}});
 w.getCarePlusClient=()=>client;w.CarePlusProfilePhotos=async()=>{};w.CarePlusDoctorPhotos=async()=>{};w.CarePlusOriginalContext=()=>({});w.CarePlusViewPHP={photoUrl:()=>''};w.CarePlusOriginalViews={'admin/reports.html':()=>'<html><head></head><body>Loaded</body></html>'};
 // Prevent document.write from fetching scripts; this test targets authenticated reads.
 w.document.open=()=>{};w.document.write=()=>{};w.document.close=()=>{};
 await w.eval(fs.readFileSync(path.join(__dirname,'../original-design/bootstrap.js'),'utf8'));
 assert.equal(w.CarePlusOriginalData.tables.appointments.length,1205);assert.deepEqual(ranges,[[0,999],[1000,1999]]);
 dom.window.close();console.log('Passed: stable authorized pagination includes records beyond the first 1,000.');
})().catch(e=>{console.error(e);process.exitCode=1;});
