/* Keep the original UI and route its requests through the existing Supabase API. */
(() => {
 'use strict';
 const state=window.CarePlusOriginalData, client=state.client;
 const nativeFetch=window.fetch.bind(window);
 const context=()=>window.CarePlusOriginalContext(state,state.page);
 const rpc=async(name,args)=>{const result=await client.rpc(name,args);if(result.error)throw result.error;return result.data;};
 const action=(name,data)=>rpc('careplus_action',{p_action:name,p_data:data});
 const find=(table,key,id)=>{const row=(context()[table]||state.tables[table]||[]).find(r=>String(r[key])===String(id));if(!row)throw Error('Record unavailable.');return row;};
 const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 function fields(body){
  if(typeof body==='string'){try{return JSON.parse(body);}catch{return Object.fromEntries(new URLSearchParams(body));}}
  const values={};
  if(body)for(const [key,value] of body){if(key.endsWith('[]'))(values[key.slice(0,-2)]??=[]).push(value);else values[key]=value;}
  return values;
 }
 async function request(url,data){
  let name=data.action||'';
  const endpoint=url.pathname.split('/').pop();
  if(endpoint==='delete_user.html')return {success:true,message:'Account deactivated; history preserved.',...await rpc('careplus_admin_manage',{p_action:'deactivate',p_data:data})};
  if(state.profile?.role==='admin'&&['users.html','patients.html','doctors.html'].includes(endpoint)){
   if(name==='edit')return {success:true,message:'Profile saved.',...await rpc('careplus_admin_manage',{p_action:'edit',p_data:data})};
   if(name==='delete')return {success:true,message:'Account deactivated; visit and payment history preserved.',...await rpc('careplus_admin_manage',{p_action:'deactivate',p_data:data})};
   if(name==='toggle_status'&&endpoint==='doctors.html')return {success:true,message:'Doctor availability updated.',...await rpc('careplus_admin_manage',{p_action:'doctor_status',p_data:{...data,status:data.new_status}})};
  }
  if(state.profile?.role==='admin'&&endpoint==='billing.html'){
   const itemRows={};
   for(const [key,value] of Object.entries(data)){const match=/^items\[(\d+)\]\[(description|amount)\]$/.exec(key);if(match)(itemRows[match[1]]??={})[match[2]]=value;}
   if(Object.keys(itemRows).length)data.items=Object.values(itemRows).map(r=>({item:r.description,price:Number(r.amount)}));
   return {success:true,message:'Payment saved.',...await rpc('careplus_save_payment',{p_action:name,p_data:data})};
  }
  if(state.profile?.role==='admin'&&endpoint==='appointments.html'&&name==='update_status')name=data.new_status==='completed'?'complete':data.new_status==='cancelled'?'cancel':data.new_status==='confirmed'?'confirm':'';
  if(state.profile?.role==='admin'&&endpoint==='appointments.html'&&name==='delete')name='cancel';
  if(endpoint==='checkin_qr.html'||endpoint==='scan_qr.html'){
   const result=await action('checkin_qr',{qr_code:data.qr_code});return {success:true,message:'Appointment checked in.',data:{'Appointment ID':result.id},...result};
  }
  if(endpoint==='notification.html'&&name==='delete')name='delete_notification';
  if(name==='reschedule_appointment'&&!data.doctor_id)data.doctor_id=find('appointments','appointment_id',data.appointment_id).doctor_id;
  if(endpoint==='update_medical_record.html')name='update_record';
  if(data.log_action){name='prescription_log';data.log_action=String(data.log_action);}
  if(endpoint==='get_activity_details.html'){
   if(state.profile?.role!=='admin')throw Error('Administrator access required.');
   const c=context(),config={appointment:['appointments','appointment_id'],doctor:['doctors','doctor_id'],patient:['patients','patient_id']}[data.type];
   if(!config)throw Error('Unknown activity type.');
   const row=find(config[0],config[1],data.id);
   let details;
   if(data.type==='appointment')details={...row,patient_image:row.patient_profile_picture,doctor_image:row.doctor_profile_picture};
   else{
    const account=(state.tables.users||[]).find(u=>String(u.user_id)===String(row.user_id))||{};
    details={...row,email:account.email||row.email||'',status:account.status||row.status||'pending',created_at:account.created_at||row.created_at,profile_image:row.profile_picture,years_experience:row.experience_years};
   }
   // Original detail renderers interpolate text into HTML; preserve it as text.
   for(const key of Object.keys(details))if(typeof details[key]==='string'&&!['profile_picture','profile_image','patient_image','doctor_image','patient_profile_picture','doctor_profile_picture','patient_profile_pic','doctor_profile_pic','doctor_picture'].includes(key))details[key]=window.CarePlusViewPHP.escape(details[key]);
   return {success:true,details};
  }
  if(endpoint==='chatbot_api.html'){const result=await action('chat',{message:data.message||data.user_message});return {success:true,...result,reply:result.response};}
  if(name==='get_slots'){
   const slots=(await rpc('careplus_slots',{p_doctor:Number(data.doctor_id),p_date:data.date})).filter(s=>s.available);
   return {success:true,slots:slots.map(s=>window.CarePlusViewPHP.date('g:i A',window.CarePlusViewPHP.timestamp(s.slot))),slot_times:slots.map(s=>s.slot)};
  }
  const details={
   'get_doctor_details.html':['doctors','doctor_id','doctor'],
   'get_prescription_details.html':['prescriptions','prescription_id','prescription'],
   'get_prescription.html':['prescriptions','prescription_id','prescription'],
   'get_payment_receipt.html':['payments','payment_id','payment']
  };
  if(details[endpoint]){
   const [table,key,label]=details[endpoint],row=find(table,key,data[key]||data.id);
   if(label==='payment'){
    if(row.payment_status!=='completed')throw Error('A receipt is available only for a completed payment.');
    let detail=row.payment_details;
    if(typeof detail==='string'){try{detail=JSON.parse(detail);}catch{detail=null;}}
    const entries=Array.isArray(detail)?detail:Array.isArray(detail?.items)?detail.items:[];
    const items=entries.map(item=>{const quantity=Number(item.quantity)||1,unit=Number(item.unit_price??item.price??0);return {item_name:item.item_name||item.item||item.name||'Service',item_type:item.item_type||'Service',quantity,unit_price:unit,total_price:Number(item.total_price??unit*quantity)};});
    if(!items.length)items.push({item_name:'Payment total',item_type:'Payment',quantity:1,unit_price:Number(row.amount),total_price:Number(row.amount)});
    return {success:true,payment:{...row,items}};
   }
   return {success:true,[label]:row};
  }
  if(name==='view_record')return {success:true,record:find('medicalRecords','record_id',data.record_id)};
  if(name==='view_check'){
   const check={...find('symptom_checks','symptom_check_id',data.check_id)};
   if(check.response==='Self-reported symptoms; no automated diagnosis performed.')check.urgency_level='unassessed';
   return {success:true,check};
  }
  if(name==='check_symptoms'){
   const result=await rpc('careplus_analyse_symptoms',{p_data:data});
   const check={...data,symptom_check_id:result.symptom_check_id,response:result.response,urgency_level:result.urgency,created_at:result.created_at,analysis_details:result.analysis_details};
   state.tables.symptom_checks??=[];
   state.tables.symptom_checks.unshift(check);
   return result;
  }
  if(name==='view_medical_record'){
   const c=context(),appointment=find('appointments','appointment_id',data.appointment_id);
   const prescriptions=c.prescriptions.filter(r=>r.status!=='cancelled'&&String(r.appointment_id)===String(appointment.appointment_id)&&String(r.patient_id)===String(appointment.patient_id)).flatMap(r=>r.medications.map(m=>({prescription_id:r.prescription_id,medication_name:m.name,dosage:m.dosage??'',frequency:m.frequency??'',duration:m.duration??'',quantity_prescribed:m.quantity??''})));
   return {success:true,appointment,medical_record:c.medicalRecords.find(r=>String(r.appointment_id)===String(appointment.appointment_id))||null,prescriptions};
  }
  if(name==='mark_all_read'){
   for(const row of state.tables.notifications||[])if(!row.is_read)await action('read_notification',{notification_id:row.notification_id});
   return {success:true,message:'Notifications marked as read.'};
  }
  const aliases={book_appointment:'book',reschedule_appointment:'reschedule',cancel_appointment:'cancel',confirm_appointment:'confirm',mark_read:'read_notification',submit_review:'review',check_symptoms:'symptom_log',update_profile:'profile',add_medical_record:'record',create_prescription:'prescribe',toggle_status:'user_status'};
  name=aliases[name]||name;
  if(endpoint==='confirm_appointment.html')name='confirm';
  if(endpoint==='cancel_appointment.html')name='cancel';
  if(endpoint==='update_appointment.html')name=data.status==='completed'?'complete':data.status==='cancelled'?'cancel':'confirm';
  if(endpoint==='add_medical_record.html')name='record';
  if(endpoint==='toggle_user_status.html')name='user_status';
  if(endpoint==='approve_doctor.html'||endpoint==='reject_doctor.html'){name='user_status';data.status=endpoint==='approve_doctor.html'?'active':'inactive';data.user_id=find('doctors','doctor_id',data.doctor_id).user_id;}
  data.date=data.date||data.appointment_date||data.new_date;
  data.time=data.time||data.appointment_time||data.new_time;
  if(name==='user_status')data.status=data.status||data.new_status;
  if(data.medications_json&&!data.medications)data.medications=JSON.parse(data.medications_json);
  if(typeof data.medications==='string')data.medications=JSON.parse(data.medications);
  if(['record','prescribe'].includes(name)&&!data.appointment_id){
   const candidates=context().appointments.filter(a=>String(a.patient_id)===String(data.patient_id)&&['confirmed','completed'].includes(a.status)&&(!data.visit_date||a.appointment_date===data.visit_date));
   if(candidates.length!==1)throw Error('Choose the appointment for this clinical record.');
   data.appointment_id=candidates[0].appointment_id;
  }
  if(!name)throw Error('This operation is unavailable on static hosting.');
  if(name==='record'||name==='update_record')return {success:true,message:'Medical record saved.',...await rpc('careplus_save_record',{p_data:data})};
  const result=await action(name,data);
  return {success:true,message:'Saved successfully.',...result};
 }
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
  if(url.origin!==location.origin||!url.pathname.endsWith('.html'))return nativeFetch(input,options);
  // Ordinary HTML navigation/refresh remains a real document request.
  if(!options.body&&!/get_.*\.html$/.test(url.pathname))return nativeFetch(input,options);
  try{return json(await request(url,{...Object.fromEntries(url.searchParams),...fields(options.body)}));}
  catch(error){return json({success:false,message:error.message});}
 };
 function status(form,message,error=false){
  let el=form.querySelector('[data-bridge-status]');
  if(!el){el=document.createElement('div');el.dataset.bridgeStatus='';el.setAttribute('role','status');form.prepend(el);}
  el.className=error?'alert alert-error':'alert alert-success';el.textContent=message;
 }
 async function submit(form,submitter){
  const data=fields(new FormData(form));if(submitter?.name)data[submitter.name]=submitter.value;
  const button=submitter||form.querySelector('[type="submit"]');if(button)button.disabled=true;
  try{
   if(form.id==='loginForm'){
    const result=await client.auth.signInWithPassword({email:data.email,password:data.password});if(result.error)throw result.error;
    const active=await rpc('careplus_role');if(!active)throw Error('Your account is pending approval or inactive.');
    location.assign(new URL(active+'/dashboard.html',state.base));return;
   }
   if(form.id==='registerForm'){
    if(data.password!==data.confirm_password)throw Error('Passwords do not match.');
    if(data.reg_type!=='patient')throw Error('Staff accounts must be authorized by the clinic administrator.');
    const demographics=Object.fromEntries(['first_name','last_name','phone','ic_number','date_of_birth','gender','address','emergency_contact','blood_type','allergies'].map(key=>[key,data[key]||'']));
    const result=await client.auth.signUp({email:data.email,password:data.password,options:{emailRedirectTo:new URL('patient.html',state.base).href,data:{...demographics,display_name:[data.first_name,data.last_name].filter(Boolean).join(' ')}}});
    if(result.error)throw result.error;
    if(result.data.session){location.assign(new URL('patient/dashboard.html',state.base));return;}
    status(form,'Check your email to confirm your account, then sign in.');return;
   }
   if(form.id==='contactForm'){await action('contact',data);form.reset();status(form,'Message sent to the clinic.');return;}
   if(form.id==='reviewForm'){
    if(!data.rating||Number(data.rating)<1||Number(data.rating)>5)throw Error('Please select a rating from 1 to 5.');
    await rpc('careplus_save_review',{p_data:data});
    status(form,'Review saved successfully.');location.reload();return;
   }
   if(form.id==='profileForm'){
    const photo=form.querySelector('input[type="file"][name="profile_picture"]')?.files?.[0];
    const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
    if(photo&&(!types[photo.type]||photo.size>5242880))throw Error('Choose a PNG, JPEG, WebP or GIF image up to 5 MB.');
    delete data.profile_picture;
    if(state.profile?.role==='doctor')data.available_days??=[];
    data.display_name=[data.first_name,data.last_name].filter(Boolean).join(' ')||state.profile.display_name;
    await action('profile',data);
    if(photo){
     const path=state.user.id+'/'+crypto.randomUUID()+'.'+types[photo.type];
     const uploaded=await client.storage.from('careplus-uploads').upload(path,photo,{contentType:photo.type});if(uploaded.error)throw uploaded.error;
     await action('avatar',{path});
     status(form,'Profile and photo saved.');location.reload();return;
    }
    status(form,'Profile saved.');location.reload();return;
   }
   if(form.id==='bookingForm')data.action='book_appointment';
   if(form.id==='rescheduleForm')data.action='reschedule_appointment';
   if(state.profile?.role==='admin'&&form.id==='patientForm'&&data.action==='add'){
    if((state.tables.users||[]).some(u=>u.email?.toLowerCase()===data.email?.trim().toLowerCase()))throw Error('This email already has an account.');
    const config=window.CAREPLUS_SUPABASE;
    const provision=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'careplus-provision-'+crypto.randomUUID()}});
    const demographics=Object.fromEntries(['first_name','last_name','phone','ic_number','date_of_birth','gender','address','emergency_contact','blood_type','allergies'].map(key=>[key,data[key]||'']));
    const created=await provision.auth.signUp({email:data.email,password:data.password,options:{emailRedirectTo:new URL('patient.html',state.base).href,data:demographics}});
    if(created.error)throw created.error;delete data.password;
    const account=await client.from('users').select('user_id').eq('email',data.email.trim().toLowerCase()).single();
    if(account.error)throw Error('Registration submitted. The patient must confirm their email before signing in. Refresh the list to check the account.');
    data.user_id=account.data.user_id;data.action='edit';
   }
   if(state.profile?.role==='admin'&&data.action==='edit'&&['patientForm','doctorForm'].includes(form.id)){
    const photo=form.querySelector('[name="profile_picture"]')?.files?.[0];delete data.profile_picture;
    if(photo){
     const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
     if(!types[photo.type]||photo.size>5242880)throw Error('Choose a PNG, JPEG, WebP or GIF image up to 5 MB.');
     const owner=await rpc('careplus_admin_upload_owner',{p_user_id:Number(data.user_id)});
     const path=owner+'/'+crypto.randomUUID()+'.'+types[photo.type];
     const result=await client.storage.from('careplus-uploads').upload(path,photo,{contentType:photo.type});if(result.error)throw result.error;
     data.profile_picture=path;
    }
   }
   const result=await request(new URL(form.action||location.href),data);
   if(!result.success)throw Error(result.message);
   status(form,result.message||'Saved successfully.');
   if(!['contactForm'].includes(form.id))location.reload();
  }catch(error){status(form,error.message,true);}
  finally{if(button)button.disabled=false;}
 }
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.method.toLowerCase()==='get'&&!['bookingForm','rescheduleForm','contactForm'].includes(form.id))return;
  event.preventDefault();event.stopImmediatePropagation();void submit(form,event.submitter);
 },true);
 const nativeSubmit=HTMLFormElement.prototype.submit;
 HTMLFormElement.prototype.submit=function(){if(this.method.toLowerCase()==='get')return nativeSubmit.call(this);void submit(this);};
 document.addEventListener('DOMContentLoaded',()=>{
  if(state.profile?.role==='admin')for(const form of document.querySelectorAll('#editUserForm,#doctorForm,#patientForm')){
   const email=form.querySelector('[name="email"]');if(email){email.readOnly=true;email.title='Sign-in email is managed by Supabase Auth.';email.addEventListener('focus',()=>{email.readOnly=!(form.id==='patientForm'&&form.querySelector('[name="action"]')?.value==='add');});}
   const role=form.querySelector('[name="role"]');if(role){role.addEventListener('focus',()=>{role.dataset.current=role.value;});role.addEventListener('change',()=>{role.value=role.dataset.current||role.value;});role.title='Role changes require account provisioning.';}
  }
  if(state.page!=='doctor/prescriptions.html'&&state.page!=='doctor/medicalRecords.html')return;
  const form=document.getElementById(state.page.includes('prescriptions')?'prescriptionForm':'recordForm');
  const patient=form?.querySelector('[name="patient_id"]');if(!patient)return;
  const group=document.createElement('div');group.className='form-group';
  const label=document.createElement('label');label.textContent='Appointment';label.htmlFor='clinicalAppointment';
  const select=document.createElement('select');select.name='appointment_id';select.id='clinicalAppointment';group.append(label,select);patient.parentElement.after(group);
  const syncVisitDate=()=>{
   const date=form.querySelector('[name="visit_date"]');
   if(!date||form.querySelector('[name="record_id"]')?.value)return;
   const appointment=context().appointments.find(a=>String(a.appointment_id)===select.value&&String(a.patient_id)===patient.value);
   if(appointment)date.value=appointment.appointment_date;
  };
  const refresh=()=>{
   const previous=select.value;select.replaceChildren(new Option('Choose an appointment…',''));
   const rows=context().appointments.filter(a=>String(a.patient_id)===patient.value&&['confirmed','completed'].includes(a.status));
   for(const a of rows)select.add(new Option('#'+a.appointment_id+' · '+a.appointment_date+' '+a.appointment_time,a.appointment_id));
   if(rows.some(a=>String(a.appointment_id)===previous))select.value=previous;else if(rows.length===1)select.value=rows[0].appointment_id;
   syncVisitDate();
  };
  patient.addEventListener('change',refresh);select.addEventListener('focus',refresh);select.addEventListener('change',syncVisitDate);refresh();
 });
 document.addEventListener('click',async event=>{
  const link=event.target.closest?.('a[href*="update_contact_status.html"]');if(!link)return;
  event.preventDefault();
  try{await action('close_contact',{contact_id:new URL(link.href).searchParams.get('id')});location.reload();}
  catch(error){link.textContent=error.message;}
 });
 window.viewPaymentByAppointment=id=>{const row=find('appointments','appointment_id',id),p=window.CarePlusViewPHP;window.viewPaymentDetails(row.appointment_id,row.doctor_name,row.specialization,p.date('M d, Y',p.timestamp(row.appointment_date)),p.date('h:i A',p.timestamp(row.appointment_time)),row.consultation_fee);};
 window.openReviewByAppointment=id=>{const row=find('appointments','appointment_id',id);window.openReviewModal(row.appointment_id,row.doctor_id,row.doctor_name,row.specialization);};
 window.editReviewByAppointment=id=>{const row=find('appointments','appointment_id',id);window.editReview(row.appointment_id,row.doctor_id,row.doctor_name,row.specialization,row.rating,row.review_text);};
})();
