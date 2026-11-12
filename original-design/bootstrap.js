(async()=>{
 const script=document.currentScript;
 const base=new URL('../',script.src);
 window.CarePlusOriginalBase=base.href;
 const pathname=decodeURIComponent(location.pathname).slice(base.pathname.length);
 const page=pathname||'index.html';
 try{
  const client=window.getCarePlusClient();
  if(page==='logout.html'){await client.auth.signOut();location.replace(new URL('login.html',base));return;}
  let session=(await client.auth.getSession()).data.session;
  const protectedRole=/^(patient|doctor|admin)\//.exec(page)?.[1];
  if(protectedRole&&!session){location.replace(new URL('login.html',base));return;}
  let user=session?.user||null,profile=null;
  if(user){
   const verified=await client.auth.getUser();if(verified.error)throw verified.error;user=verified.data.user;
   const result=await client.from('profiles').select('role,display_name,legacy_user_id').eq('id',user.id).single();if(result.error)throw result.error;profile=result.data;
   if(protectedRole){
    const active=await client.rpc('careplus_role');if(active.error)throw active.error;
    if(!active.data){location.replace(new URL('login.html?notice=Your+account+is+pending+approval+or+inactive.',base));return;}
    if(profile.role!==protectedRole){location.replace(new URL(profile.role+'/dashboard.html',base));return;}
   }
  }
  const tables={};
  if(protectedRole){
   const names=['users','patients','doctors','admins','appointments','medical_records','prescriptions','payments','notifications','reviews','clinic_catalog','symptom_scope','symptom_checks','chatbot_logs','qr_event_logs'];
   if(profile.role==='admin')names.push('contact_submissions');
   await Promise.all(names.map(async name=>{const {data,error}=await client.from(name).select('*').limit(1000);if(error)throw error;tables[name]=data||[];}));
   // Storage RLS grants images only to their owner or authorized clinic staff.
   await window.CarePlusProfilePhotos(client,tables);
  }
  const directory=await client.rpc('careplus_doctors');if(directory.error&&protectedRole)throw directory.error;
  const contacts=user?await client.rpc('careplus_doctor_contacts'):{data:[]};
  if(contacts.error)console.error('Doctor contact numbers unavailable:',contacts.error.message);
  for(const doctor of directory.data||[]){
   const contact=(contacts.data||[]).find(row=>String(row.doctor_id)===String(doctor.doctor_id));
   if(contact)doctor.phone=contact.phone;
  }
  await window.CarePlusDoctorPhotos(client,directory.data||[],tables);
  const data={client,user,profile,tables,directory:directory.data||[],page,base:base.href};
  window.CarePlusOriginalData=data;
  const context=window.CarePlusOriginalContext(data,page);
  const notice=new URLSearchParams(location.search).get('notice');if(notice)context.errors=[notice];
  const view=window.CarePlusOriginalViews[page==='resetPassword.html'?'forgotPassword.html':page];
  if(!view)throw new Error('Original page template is unavailable: '+page);
  let html=view(context,window.CarePlusViewPHP).replace(/\.php\b/g,'.html').replace(/(src=["'])(?:\.\.\/)+(https?:\/\/)/g,'$1$2');
  // Start the backend bridge before original page scripts execute.
  html=html.replace(/<head>/i,'<head><script src="'+base.href+'original-design/bridge.js"></script>');
  html=html.replace(/\b(src|href)=(['"])([^'"]+)\2/g,(tag,attr,quote,value)=>{
   const url=new URL(value,location.href);
   if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return tag;
   const version=window.CarePlusAssetVersions?.[decodeURIComponent(url.pathname.slice(base.pathname.length))];
   if(!version)return tag;
   url.searchParams.set('v',version);return attr+'='+quote+url.href+quote;
  });
  document.open();document.write(html);document.close();
 }catch(error){
  console.error('CarePlus original view:',error);
  document.body.replaceChildren();const p=document.createElement('p');p.textContent=error.message;const a=document.createElement('a');a.href=new URL('login.html',base).href;a.textContent='Back to login';document.body.append(p,a);
 }
})();
