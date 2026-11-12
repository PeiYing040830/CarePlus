const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,requestInterceptor,VirtualConsole}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const resources={interceptors:[requestInterceptor(request=>{const u=new URL(request.url);const type=u.pathname.endsWith('.css')?'text/css':'application/javascript';if(u.origin!=='http://127.0.0.1:8080')return new Response('',{headers:{'content-type':type}});const file=path.join(root,decodeURIComponent(u.pathname));return new Response(fs.readFileSync(file),{headers:{'content-type':type}});})]};
(async()=>{
 for(const role of ['patient','doctor','admin'])for(const page of ['dashboard','profile']){
 const signed='https://images.example.test/storage/v1/object/sign/careplus-uploads/test/'+role+'.png?token=test';
 const row={user_id:1,patient_id:1,doctor_id:1,admin_id:1,first_name:'Test',last_name:role,date_of_birth:'2000-08-30',profile_picture:'test-uuid/'+role+'.png'};
 const fixtures={users:[{user_id:1,email:'test@example.test',status:'active'}],[role==='patient'?'patients':role==='doctor'?'doctors':'admins']:[row]};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'test-uuid'}}}}),getUser:async()=>({data:{user:{id:'test-uuid',email:'test@example.test'}}})},from:name=>({select:()=>({eq:()=>({single:async()=>({data:{role,legacy_user_id:1,display_name:'Test '+role}})}),limit:async()=>({data:structuredClone(fixtures[name]||[])})})}),rpc:async(name)=>({data:name==='careplus_role'?role:[]}),storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:signed}})})}};
 const shell=read(role+'/'+page+'.html');assert.equal((shell.match(/original-design\/app-core\.js\?v=/g)||[]).length,1);assert(!shell.includes('src="../original-design/context.js"'));
 const console=new VirtualConsole(),errors=[];console.on('jsdomError',e=>{if(e.type!=='not-implemented')errors.push(e.message);});
 const dom=new JSDOM(shell,{url:'http://127.0.0.1:8080/'+role+'/'+page+'.html',runScripts:'dangerously',resources,virtualConsole:console,beforeParse(w){
  w.supabase={createClient:()=>client};w.fetch=async()=>new Response(JSON.stringify({success:true,notifications:[],unread_count:0}),{headers:{'content-type':'application/json'}});w.Response=Response;w.HTMLElement.prototype.scrollIntoView=()=>{};
  // A stale prior runtime must be replaced by the complete core bundle.
  w.CarePlusViewPHP={};w.lucide={createIcons(){}};w.Chart=class{destroy(){} update(){}};
 }});
 for(let i=0;i<100&&!dom.window.document.querySelector('.navbar');i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(typeof dom.window.CarePlusViewPHP.ageParts,'function');
 assert(dom.window.document.querySelector('.navbar'),'Dashboard must render through its actual HTML entry point');
 assert(!dom.window.document.body.textContent.includes('P.ageParts is not a function'));
 const stylesheet=dom.window.document.querySelector('link[href*="header-layout.css"]');assert(stylesheet);assert(new URL(stylesheet.href).searchParams.get('v'));
 const nav=dom.window.document.querySelector('.header > .navbar');assert(nav,role+'/'+page+' retains its header');
 for(let i=0;i<100&&dom.window.getComputedStyle(nav).display!=='grid';i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(dom.window.getComputedStyle(nav).display,'grid',role+'/'+page+' applies the shared header layout');
 assert.equal(dom.window.getComputedStyle(nav.querySelector(':scope > .logo')).gridColumn,'1');
 assert.equal(dom.window.getComputedStyle(nav.querySelector(':scope > .mobile-menu-toggle')).gridColumn,'2');
 const avatar=dom.window.document.querySelector('.user-badge img');assert(avatar,role+' sidebar avatar must exist');assert.equal(avatar.src,signed);
 if(page==='profile'){const image=dom.window.document.querySelector('img#profilePreview');assert(image,role+' profile photograph must exist');assert.equal(image.src,signed);}
 assert.deepEqual(errors,[],role+'/'+page);
 dom.window.close();
 }
 process.stdout.write('Passed: all three roles dashboard/profile bootstrap, private signed sidebar/profile images, stale runtime replacement and asset versions.\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
