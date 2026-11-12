const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'original-design/bridge.js'),'utf8'),tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 for(const role of ['patient','doctor','admin'])for(const valid of [true,false]){
  const dom=new JSDOM('<form id="profileForm" method="post"><input name="phone" value="0123456789"><input name="profile_picture" type="file"><button type="submit">Save</button></form>',{url:'http://127.0.0.1:8080/'+role+'/profile.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window;await tick();
  const calls=[],file=new w.File(['synthetic image'],valid?'avatar.png':'unsupported.txt',{type:valid?'image/png':'text/plain'});
  Object.defineProperty(w.document.querySelector('[type=file]'),'files',{value:[file]});
  Object.defineProperty(w.crypto,'randomUUID',{value:()=> 'test-object-id'});
  w.fetch=async()=>{};w.Response=Response;
  w.CarePlusOriginalData={
   profile:{role,display_name:'Test User'},user:{id:role+'-uuid'},
   client:{
    rpc:async(name,args)=>{calls.push([name,args]);return {data:{ok:true}};},
    storage:{from:bucket=>({upload:async(name,blob,options)=>{calls.push(['upload',{bucket,name,type:blob.type,options}]);return {data:{path:name}};}})}
   }
  };
  w.eval(code);w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();
  if(valid){assert(calls.some(([n,a])=>n==='upload'&&a.bucket==='careplus-uploads'&&a.name===role+'-uuid/test-object-id.png'));assert(calls.some(([n,a])=>n==='careplus_action'&&a.p_action==='avatar'&&a.p_data.path===role+'-uuid/test-object-id.png'));assert(w.document.querySelector('[role=status]').textContent.includes('photo saved'));}
  else{assert.equal(calls.length,0);assert(w.document.querySelector('[role=status]').textContent.includes('up to 5 MB'));}
  dom.window.close();
 }
 console.log('Passed: patient/doctor/admin private photo upload, own-account object paths, avatar persistence and invalid file rejection. No files uploaded remotely.');
})().catch(e=>{console.error(e);process.exitCode=1;});
