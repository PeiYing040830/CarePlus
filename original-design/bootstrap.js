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
   if(page==='doctor/prescription_logs.html')names.push('prescription_logs');
   if(profile.role==='admin')names.push('contact_submissions');
   const keys={users:'user_id',patients:'patient_id',doctors:'doctor_id',admins:'admin_id',appointments:'appointment_id',medical_records:'record_id',prescriptions:'prescription_id',payments:'payment_id',notifications:'notification_id',reviews:'review_id',clinic_catalog:'catalog_id',symptom_scope:'scope_id',symptom_checks:'symptom_check_id',chatbot_logs:'chatbot_id',qr_event_logs:'qr_id',prescription_logs:'log_id',contact_submissions:'contact_id'};
   await Promise.all(names.map(async name=>{
    tables[name]=[];
    for(let offset=0;;offset+=1000){
     let query=client.from(name).select('*');
     const paged=typeof query.order==='function'&&typeof query.range==='function';
     const {data,error}=await (paged?query.order(keys[name],{ascending:false}).range(offset,offset+999):query.limit(1000));
     if(error)throw error;tables[name].push(...(data||[]));
     if(!paged||!data||data.length<1000)break;
    }
   }));
   // Storage RLS grants images only to their owner or authorized clinic staff.
   await window.CarePlusProfilePhotos(client,tables);
   if(profile.role==='doctor'){
    const contacts=await client.rpc('careplus_patient_contacts');if(contacts.error)throw contacts.error;
    for(const patient of tables.patients||[])patient.email=(contacts.data||[]).find(r=>String(r.patient_id)===String(patient.patient_id))?.email||'';
   }
  }
  let historicalDoctors=[];
  if(protectedRole){
   const history=await client.rpc('careplus_historical_doctors');if(history.error)throw history.error;
   historicalDoctors=history.data||[];
   await window.CarePlusProfilePhotos(client,{doctors:historicalDoctors});
  }
  const directory=await client.rpc('careplus_doctors');if(directory.error&&protectedRole)throw directory.error;
  const contacts=user?await client.rpc('careplus_doctor_contacts'):{data:[]};
  if(contacts.error)console.error('Doctor contact numbers unavailable:',contacts.error.message);
  for(const doctor of directory.data||[]){
   const contact=(contacts.data||[]).find(row=>String(row.doctor_id)===String(doctor.doctor_id));
   if(contact)doctor.phone=contact.phone;
  }
  if(user){
   const ratings=await client.rpc('careplus_doctor_ratings');if(ratings.error)throw ratings.error;
   for(const doctor of directory.data||[]){const summary=(ratings.data||[]).find(r=>String(r.doctor_id)===String(doctor.doctor_id));if(summary)doctor.rating_summary=summary;}
  }
  await window.CarePlusDoctorPhotos(client,directory.data||[],tables);
  const data={client,user,profile,tables,directory:directory.data||[],historicalDoctors,page,base:base.href};
  window.CarePlusOriginalData=data;
  const context=window.CarePlusOriginalContext(data,page);
  const notice=new URLSearchParams(location.search).get('notice');if(notice)context.errors=[notice];
  const view=window.CarePlusOriginalViews[page==='resetPassword.html'?'forgotPassword.html':page];
  if(!view)throw new Error('Original page template is unavailable: '+page);
  let html=view(context,window.CarePlusViewPHP).replace(/\.php\b/g,'.html').replace(/(src=["'])(?:\.\.\/)+(https?:\/\/)/g,'$1$2');
  // Start the backend bridge before original page scripts execute.
  html=html.replace(/<head>/i,'<head><script src="'+base.href+'original-design/bridge.js"></script>');
  html=html.replace(/\b(src|href|data-photo|data-profile-picture|data-profile-image)=(['"])([^'"]+)\2/g,(tag,attr,quote,value)=>{
   const imageUrl=attr==='href'?'':window.CarePlusViewPHP.photoUrl(value);
   if(imageUrl)value=imageUrl;
   const url=new URL(value,location.href);
   if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return imageUrl?attr+'='+quote+imageUrl+quote:tag;
   const version=window.CarePlusAssetVersions?.[decodeURIComponent(url.pathname.slice(base.pathname.length))];
   if(!version)return imageUrl?attr+'='+quote+imageUrl+quote:tag;
   url.searchParams.set('v',version);return attr+'='+quote+url.href+quote;
  });
  document.open();document.write(html);document.close();
 }catch(error){
  console.error('CarePlus original view:',error);
  document.body.replaceChildren();const p=document.createElement('p');p.textContent=error.message;const a=document.createElement('a');a.href=new URL('login.html',base).href;a.textContent='Back to login';document.body.append(p,a);
 }
})();
