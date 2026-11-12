/* Execute every portal HTML entry, including its real generated assets. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,requestInterceptor,VirtualConsole}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..');
const resources={interceptors:[requestInterceptor(request=>{
 const url=new URL(request.url);if(url.origin!=='http://127.0.0.1:8080')return new Response('');
 const file=path.join(root,decodeURIComponent(url.pathname));return new Response(fs.readFileSync(file),{headers:{'content-type':file.endsWith('.css')?'text/css':'application/javascript'}});
})]};
(async()=>{
 let count=0;const failures=[];
 for(const role of ['patient','doctor','admin'])for(const file of fs.readdirSync(path.join(root,role)).filter(f=>f.endsWith('.html'))){
  const errors=[],requestedTables=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='not-implemented')errors.push(e.message);});
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic'}}}}),getUser:async()=>({data:{user:{id:'synthetic',email:'synthetic@example.test'}}})},rpc:async name=>({data:name==='careplus_role'?role:[]}),from:name=>(requestedTables.push(name),{select:()=>({eq:()=>({single:async()=>({data:{role,legacy_user_id:1,display_name:'Synthetic User'}})}),limit:async()=>({data:name==='users'?[{user_id:1,email:'synthetic@example.test',status:'active',user_type:role}]:[]})})}),storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://example.test/synthetic.png'}})})}};
  const dom=new JSDOM(fs.readFileSync(path.join(root,role,file),'utf8'),{url:'http://127.0.0.1:8080/'+role+'/'+file,runScripts:'dangerously',resources,virtualConsole:vc,beforeParse(w){
   w.supabase={createClient:()=>client};w.fetch=async()=>new Response('{}');w.Response=Response;w.lucide={createIcons(){}};w.HTMLElement.prototype.scrollIntoView=()=>{};
   w.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this};};w.Chart=class{destroy(){}update(){}};
   w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
   w.Html5Qrcode=class{static getCameras(){return Promise.resolve([]);}getState(){return 1;}stop(){return Promise.resolve();}};
   w.Html5QrcodeScanner=class{render(){}clear(){}};w.Html5QrcodeSupportedFormats={QR_CODE:0};
  }});
  for(let n=0;n<100&&!dom.window.CarePlusOriginalData;n++)await new Promise(r=>setTimeout(r,10));
  await new Promise(r=>setTimeout(r,80));
  if(!dom.window.CarePlusOriginalData||errors.length)failures.push({page:role+'/'+file,errors});
  assert.equal(requestedTables.includes('prescription_logs'),role==='doctor'&&file==='prescription_logs.html','Only the prescription log page may depend on its log table');
  dom.window.close();count++;
 }
 assert.deepEqual(failures,[]);console.log('Passed: '+count+' portal HTML entries and their page scripts boot without runtime exceptions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
