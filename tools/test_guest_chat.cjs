const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../.careplus-test-tools/node_modules/jsdom');
(async()=>{
 const dom=new JSDOM('',{url:'http://localhost/chatbot.html',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.Response=Response;w.fetch=async()=>{};
 const state={user:null,client:{rpc:async(name,args)=>{calls.push([name,args]);return {data:{response:'Public answer'}};}}};w.CarePlusOriginalData=state;
 w.eval(fs.readFileSync(path.join(__dirname,'../original-design/bridge.js'),'utf8'));
 const send=async()=>(await w.fetch('chatbot_api.html',{method:'POST',body:JSON.stringify({message:'opening hours'})})).json();
 assert.equal((await send()).reply,'Public answer');assert.equal(calls[0][0],'careplus_guest_chat');
 state.user={id:'test'};await send();assert.equal(calls[1][0],'careplus_action');assert.equal(calls[1][1].p_action,'chat');
 dom.window.close();console.log('Passed: public chatbot uses guest RPC and signed-in chat retains authenticated routing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
