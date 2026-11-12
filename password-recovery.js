/* Supabase email recovery; independent of the legacy PHP templates. */
(() => {
 'use strict';
 const form=document.getElementById('recovery-form');
 const status=document.getElementById('recovery-status');
 const button=form.querySelector('button[type="submit"]');
 const reset=form.dataset.mode==='reset';
 let client,ready=false,busy=false,complete=false;
 const show=(message,error=false)=>{status.hidden=false;status.className=error?'alert alert-error':'alert alert-success';status.textContent=message;};
 const enable=()=>{ready=true;if(!busy&&!complete)button.disabled=false;};
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||complete||!client||(reset&&!ready))return;
  if(!form.reportValidity())return;
  busy=true;button.disabled=true;
  try{
   if(reset){
    const password=form.elements.password.value;
    if(password!==form.elements.confirm_password.value)throw Error('Passwords do not match.');
    const {data,error:sessionError}=await client.auth.getSession();
    if(sessionError||!data.session)throw Error('Your reset link has expired. Please request a new link.');
    const {error}=await client.auth.updateUser({password});if(error)throw error;
    complete=true;form.reset();
    show('Password updated successfully. You can now return to login and sign in with your new password.');
    // Updating succeeded even if local session cleanup encounters a network error.
    await client.auth.signOut({scope:'local'}).catch(()=>{});
   }else{
    const {error}=await client.auth.resetPasswordForEmail(form.elements.email.value.trim(),{redirectTo:new URL('resetPassword.html',location.href).href});
    if(error)throw error;
    show('If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.');
   }
  }catch(error){show(error.message||'Unable to connect. Please try again.',true);}
  finally{busy=false;button.disabled=complete||(reset&&!ready);}
 });
 (async()=>{
  try{
   const params=new URLSearchParams(location.hash.slice(1));
   const query=new URLSearchParams(location.search);
   const callbackError=params.get('error_description')||query.get('error_description')||params.get('error')||query.get('error');
   if(callbackError)throw Error('This reset link is invalid or expired. Please request a new link.');
   client=window.getCarePlusClient();
   if(!reset)return;
   show('Checking your password reset link…');
   client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'&&session)enable();
    if(event==='SIGNED_OUT'){ready=false;button.disabled=true;}
   });
   // The SDK validates the email callback and restores its session before resolving.
   const {data,error}=await client.auth.getSession();if(error)throw error;
   if(!data.session)throw Error('Open the reset link in your email, or request a new link.');
   const verified=await client.auth.getUser();if(verified.error)throw verified.error;
   if(!verified.data.user)throw Error('This reset link is invalid or expired. Please request a new link.');
   enable();status.hidden=true;
  }catch(error){button.disabled=true;show(error.message||'Unable to load password recovery. Please reload.',true);}
 })();
})();
