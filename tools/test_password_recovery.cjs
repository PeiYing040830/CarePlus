const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
async function setup(reset,options={}){
 const calls=[];const file=reset?'resetPassword.html':'forgotPassword.html';
 const dom=new JSDOM(read(file),{url:'http://127.0.0.1:8080/'+file+(options.hash||''),runScripts:'outside-only'}),w=dom.window;
 const session=options.session===false?null:{user:{id:'test'}};
 w.getCarePlusClient=()=>({auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:{id:'test'}}}),resetPasswordForEmail:async(...args)=>{calls.push(['send',...args]);return {error:options.error?{message:options.error}:null};},updateUser:async(data)=>{calls.push(['update',data]);return {error:null};},signOut:async()=>({error:null})}});
 w.eval(read('password-recovery.js'));await tick();
 const form=w.document.querySelector('form');
 assert.equal(w.document.querySelector('[name="ic_number"], [name="security_answer"], script[src="forgotPassword.js"]'),null);
 return {dom,w,calls,form,submit:async()=>{form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();}};
}
(async()=>{
 let t=await setup(false);t.form.elements.email.value='test@example.test';await t.submit();assert.equal(t.calls[0][0],'send');assert.equal(t.calls[0][2].redirectTo,'http://127.0.0.1:8080/resetPassword.html');assert(t.w.document.querySelector('[role="status"]').textContent.includes('If an account exists'));t.dom.window.close();
 t=await setup(false,{error:'Email rate limit exceeded'});t.form.elements.email.value='test@example.test';await t.submit();assert(t.w.document.querySelector('[role="status"]').textContent.includes('rate limit'));assert.equal(t.form.querySelector('button').disabled,false);t.dom.window.close();
 t=await setup(true,{session:false});assert.equal(t.form.querySelector('button').disabled,true);await t.submit();assert.equal(t.calls.length,0);t.dom.window.close();
 t=await setup(true,{hash:'#error=access_denied&error_description=expired'});assert.equal(t.form.querySelector('button').disabled,true);assert(t.w.document.querySelector('[role="status"]').textContent.includes('expired'));t.dom.window.close();
 t=await setup(true);t.form.elements.password.value='new-test-password';t.form.elements.confirm_password.value='different-password';await t.submit();assert.equal(t.calls.length,0);assert(t.w.document.querySelector('[role="status"]').textContent.includes('do not match'));
 t.form.elements.confirm_password.value='new-test-password';await t.submit();assert.equal(t.calls[0][0],'update');assert.equal(t.calls[0][1].password,'new-test-password');assert.equal(t.form.querySelector('button').disabled,true);assert(t.w.document.querySelector('[role="status"]').textContent.includes('successfully'));t.dom.window.close();
 console.log('Passed: recovery email/redirect, delivery errors, missing/expired session, password mismatch, successful update. No emails sent or real passwords changed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
