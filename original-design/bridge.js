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
  return body?Object.fromEntries(body):{};
 }
 async function request(url,data){
  let name=data.action||'';
  const endpoint=url.pathname.split('/').pop();
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
   const prescriptions=c.prescriptions.filter(r=>String(r.appointment_id)===String(appointment.appointment_id)&&String(r.patient_id)===String(appointment.patient_id)).flatMap(r=>r.medications.map(m=>({prescription_id:r.prescription_id,medication_name:m.name,dosage:m.dosage??'',frequency:m.frequency??'',duration:m.duration??'',quantity_prescribed:m.quantity??''})));
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
  if(endpoint==='approve_doctor.html'){name='user_status';data.status='active';}
  data.date=data.date||data.appointment_date||data.new_date;
  data.time=data.time||data.appointment_time||data.new_time;
  if(name==='user_status')data.status=data.status||data.new_status;
  if(data.medications_json&&!data.medications)data.medications=JSON.parse(data.medications_json);
  if(!name)throw Error('This operation is unavailable on static hosting.');
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
    const result=await client.auth.signUp({email:data.email,password:data.password,options:{emailRedirectTo:new URL('patient.html',state.base).href,data:{display_name:[data.first_name,data.last_name].filter(Boolean).join(' ')}}});
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
    data.display_name=[data.first_name,data.last_name].filter(Boolean).join(' ')||state.profile.display_name;
    await action('profile',data);status(form,'Profile saved.');return;
   }
   if(form.id==='bookingForm')data.action='book_appointment';
   if(form.id==='rescheduleForm')data.action='reschedule_appointment';
   const result=await request(new URL(form.action||location.href),data);
   if(!result.success)throw Error(result.message);
   status(form,result.message||'Saved successfully.');
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
 window.viewPaymentByAppointment=id=>{const row=find('appointments','appointment_id',id),p=window.CarePlusViewPHP;window.viewPaymentDetails(row.appointment_id,row.doctor_name,row.specialization,p.date('M d, Y',p.timestamp(row.appointment_date)),p.date('h:i A',p.timestamp(row.appointment_time)),row.consultation_fee);};
 window.openReviewByAppointment=id=>{const row=find('appointments','appointment_id',id);window.openReviewModal(row.appointment_id,row.doctor_id,row.doctor_name,row.specialization);};
 window.editReviewByAppointment=id=>{const row=find('appointments','appointment_id',id);window.editReview(row.appointment_id,row.doctor_id,row.doctor_name,row.specialization,row.rating,row.review_text);};
})();
