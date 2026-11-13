/* Adapt authorized Supabase rows to the original views' variable names. */
window.CarePlusOriginalContext=(data,page)=>{
 const t=data.tables||{},P=window.CarePlusViewPHP,profile=data.profile||{},user=data.user||{},role=profile.role||'guest',uid=profile.legacy_user_id;
 const now=Date.now()/1000,today=P.date('Y-m-d'),params=new URLSearchParams(location.search),name=r=>[r?.first_name,r?.last_name].filter(Boolean).join(' ');
 const by=(rows,key,value)=>(rows||[]).find(r=>String(r[key])===String(value))||{};
 const users=t.users||[];
 const doctors=(data.directory||[]).map(d=>{const raw=by(t.doctors,'doctor_id',d.doctor_id);const words=d.name.split(' ');return {...d,first_name:words.slice(0,-1).join(' ')||words[0],last_name:words.length>1?words.at(-1):'',profile_picture:d.profile_picture||null,...raw,avg_rating:0,review_count:0,total_reviews:0};});
 for(const d of t.doctors||[])if(!doctors.some(x=>String(x.doctor_id)===String(d.doctor_id)))doctors.push({...d,avg_rating:0,review_count:0});
 for(const d of doctors){const ratings=(t.reviews||[]).filter(r=>String(r.doctor_id)===String(d.doctor_id));d.review_count=Number(d.rating_summary?.review_count??ratings.length);d.total_reviews=d.review_count;d.avg_rating=Number(d.rating_summary?.avg_rating??(ratings.length?ratings.reduce((sum,r)=>sum+Number(r.rating||0),0)/ratings.length:0));}
 const activeDoctorId=by(doctors,'user_id',uid).doctor_id;
 const patients=(t.patients||[]).map(r=>{
  const visits=(t.appointments||[]).filter(a=>String(a.patient_id)===String(r.patient_id)&&a.status==='completed'&&a.appointment_date&&a.appointment_date<=today&&(role!=='doctor'||String(a.doctor_id)===String(activeDoctorId)));
  const lastVisit=visits.map(a=>a.appointment_date).sort().at(-1)||null;
  const latestRecord=(t.medical_records||[]).filter(record=>String(record.patient_id)===String(r.patient_id)&&(role!=='doctor'||String(record.doctor_id)===String(activeDoctorId))&&record.visit_date&&record.visit_date<=today).sort((a,b)=>b.visit_date.localeCompare(a.visit_date)||Number(b.record_id)-Number(a.record_id))[0];
  return {...r,email:by(users,'user_id',r.user_id).email||r.email||'',status:by(users,'user_id',r.user_id).status||'active',full_name:name(r),patient_name:name(r),age:r.date_of_birth?P.ageParts(r.date_of_birth,today).years:'',total_visits:visits.length,completed_visits:visits.length,last_visit:lastVisit,medical_conditions:r.allergies||'',last_diagnosis:latestRecord?.diagnosis||'',last_prescription:latestRecord?.prescription||''};
 });
 const doctorLookup=[...(data.historicalDoctors||[]),...doctors];
 const enrich=r=>{const d=by(doctorLookup,'doctor_id',r.doctor_id),patient=by(patients,'patient_id',r.patient_id),a=by(t.appointments,'appointment_id',r.appointment_id);return {...a,...r,phone:patient.phone,email:patient.email,ic_number:patient.ic_number,blood_type:patient.blood_type,doctor_fname:d.first_name||'',doctor_lname:d.last_name||'',appointment_status:a.status||r.status,doctor_name:name(d),doctor_phone:d.phone||'',doctor_gender:d.gender||null,doctor_first_name:d.first_name,doctor_last_name:d.last_name,specialization:d.specialization,consultation_fee:d.consultation_fee,doctor_picture:d.profile_picture,doctor_profile_picture:d.profile_picture,doctor_profile_pic:d.profile_picture,patient_fname:patient.first_name||'',patient_lname:patient.last_name||'',patient_first_name:patient.first_name,patient_last_name:patient.last_name,patient_name:name(patient),patient_phone:patient.phone,patient_email:patient.email,patient_ic:patient.ic_number,patient_dob:patient.date_of_birth,patient_age:patient.age??null,age:patient.age??null,gender:patient.gender,date_of_birth:patient.date_of_birth,patient_gender:patient.gender,patient_profile_picture:patient.profile_picture,patient_profile_pic:patient.profile_picture,profile_picture:patient.profile_picture};};
 const medicationRows=raw=>{
  let rows=raw;if(typeof rows==='string'){try{rows=JSON.parse(rows);}catch{rows=[];}}
  return Array.isArray(rows)?rows.filter(m=>m&&typeof m==='object').map(m=>{
   const medicationName=m.name??m.medication_name??'',quantity=m.quantity??m.quantity_prescribed??null;
   return {...m,name:medicationName,medication_name:medicationName,dosage:m.dosage??'',frequency:m.frequency??'',duration:m.duration??'',instructions:m.instructions??'',quantity,quantity_prescribed:quantity};
  }):[];
 };
 const appointments=(t.appointments||[]).map(enrich),records=(t.medical_records||[]).map(enrich),payments=(t.payments||[]).map(enrich);
 const prescriptions=(t.prescriptions||[]).map(r=>{const medications=medicationRows(r.medications_json);return {...enrich(r),medications,medication_count:medications.length,medications_json:JSON.stringify(medications)};});
 const me={...by(role==='doctor'?doctors:role==='admin'?t.admins:patients,'user_id',uid),...by(users,'user_id',uid),email:user.email||'',profile_picture:by(role==='doctor'?doctors:role==='admin'?t.admins:patients,'user_id',uid).profile_picture};
 const notifications=t.notifications||[],scopes=t.symptom_scope||[],checks=(t.symptom_checks||[]).map(r=>{const details=typeof r.analysis_details==='string'?JSON.parse(r.analysis_details||'null'):r.analysis_details;const scopes=Array.isArray(details)?details:details?.matched_scopes||[];return {...r,matched_symptoms:scopes.map(s=>s.symptom_name).filter(Boolean).join(', '),urgency_level:r.response==='Self-reported symptoms; no automated diagnosis performed.'?'unassessed':r.urgency_level};}),reviews=t.reviews||[];
 const group=(rows,fn)=>rows.reduce((a,r)=>{(a[fn(r)]??=[]).push(r);return a;},{});
 const count=(rows,key,value)=>rows.filter(r=>r[key]===value).length;
 const upcoming=appointments.filter(a=>a.appointment_date>=today&&['pending','confirmed'].includes(a.status));
 const todays=appointments.filter(a=>a.appointment_date===today);
 const statusCounts=Object.fromEntries(['pending','confirmed','cancelled','completed'].map(s=>[s,count(appointments,'status',s)]));statusCounts.all=appointments.length;
 const appointmentStats={...statusCounts,total:appointments.length,upcoming:upcoming.filter(a=>a.status==='confirmed').length,today:todays.length};
 const paid=payments.filter(p=>p.payment_status==='completed'),pendingPayments=appointments.filter(a=>a.payment_status!=='paid'&&a.status!=='cancelled');
 const sum=(rows,key)=>rows.reduce((n,r)=>n+Number(r[key]||0),0),paymentStats={total_paid:sum(paid,'amount'),pending_amount:sum(pendingPayments,'consultation_fee')};
 const commonStats={...appointmentStats,total_records:records.length,doctors_consulted:new Set(records.map(r=>r.doctor_id)).size,months_active:new Set(records.map(r=>(r.visit_date||'').slice(0,7))).size,total_patients:patients.length,total_doctors:doctors.length,total_specializations:new Set(doctors.map(d=>d.specialization)).size,avg_fee:doctors.length?sum(doctors,'consultation_fee')/doctors.length:0,total_prescriptions:prescriptions.length,total_medications:prescriptions.reduce((n,r)=>n+r.medications.length,0),latest_prescription:prescriptions[0]?.prescription_date,total_notifications:notifications.length,unread_count:notifications.filter(n=>!n.is_read).length,appointment_count:count(notifications,'notification_type','appointment'),payment_count:count(notifications,'notification_type','payment'),reminder_count:count(notifications,'notification_type','reminder'),today_records:records.filter(r=>r.visit_date===today).length,this_week:records.filter(r=>P.timestamp(r.visit_date)>now-604800).length,with_lab_results:records.filter(r=>r.lab_results).length,with_prescription:records.filter(r=>r.prescription).length,total_users:users.length,active_users:count(users,'status','active'),total_appointments:appointments.length,completed_appointments:statusCounts.completed,avg_rating:reviews.length?sum(reviews,'rating')/reviews.length:0,total_reviews:reviews.length,total_revenue:sum(paid,'amount'),today_revenue:sum(paid.filter(p=>(p.payment_date||'').slice(0,10)===today),'amount')};
 if(page==='admin/billing.html'){commonStats.pending=count(payments,'payment_status','pending');commonStats.completed=paid.length;}
 if(page==='admin/doctors.html')Object.assign(commonStats,{total:doctors.length,active:count(doctors,'status','active'),specs:commonStats.total_specializations});
 if(page==='admin/patients.html')Object.assign(commonStats,{total:patients.length,active:count(patients,'status','active'),male:count(patients,'gender','male'),female:count(patients,'gender','female')});
 const session=data.user?{user_id:uid,user_type:role,email:user.email}:{};
 const fullName=profile.display_name||name(me),initials=fullName.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
 const c={_SESSION:session,_POST:{},_GET:Object.fromEntries(params),_SERVER:{PHP_SELF:'/'+page.replace('.html','.php')},
  loginType:params.get('type')||'patient',regType:params.get('type')||'patient',step:page==='resetPassword.html'?'reset':'verify',errors:[],error:'',success:'',name:'',email:'',phone:'',subject:'general',message:'',messageType:'success',
  colors:{patient:{primary:'#26a69a',secondary:'#00897b',light:'#d4f1e8'},doctor:{primary:'#6DADE8',secondary:'#8AC6F5',light:'#F5FAFF'},admin:{primary:'#FF8C42',secondary:'#FFB380',light:'#FFF5EE'}}[role]||{},
  currentPath:'/'+page.replace('.html','.php'),baseUrl:window.CarePlusOriginalBase?.replace(/\/$/,''),logoutPath:window.CarePlusOriginalBase+'logout.html',
  patientName:fullName,patientFullName:fullName,patientInitials:initials,doctorName:fullName,doctorFullName:fullName,doctorInitials:initials,adminName:fullName,adminInitials:initials,adminRole:'System Administrator',
  me,admin:me,doctor:me,patient:me,userName:fullName,user_name:fullName,session_id:user.id||'guest',patient_id:me.patient_id||null,realPatientId:me.patient_id||null,real_patient_id:me.patient_id||null,is_logged_in:!!data.user,
  profilePicture:me.profile_picture,profilePictureUrl:me.profile_picture,hasValidImage:!!me.profile_picture,
  users:users.map(u=>({...by(patients,'user_id',u.user_id),...by(doctors,'user_id',u.user_id),...by(t.admins,'user_id',u.user_id),...u})),doctors,patients,appointments,medicalRecords:records,allRecords:records,payments,prescriptions,notifications,
  stats:commonStats,statistics:{...commonStats,cancelled_appointments:statusCounts.cancelled},appointmentStats,statusCounts,paymentStats,todayStats:{total_today:todays.length,completed_today:count(todays,'status','completed')},todaySummary:{pending_count:count(todays,'status','pending'),confirmed_count:count(todays,'status','confirmed'),cancelled_count:count(todays,'status','cancelled')},actionRequired:{pending_count:statusCounts.pending,recent_cancellations:0,reschedule_requests:0},totalActionsRequired:statusCounts.pending,
  todayAppointments:todays,upcomingAppointments:upcoming.slice(0,3),upcomingCount:upcoming.length,pendingAppointments:appointments.filter(a=>a.status==='pending'),pendingCount:statusCounts.pending,
  recentMedicalRecords:records.slice(0,3),recentPayments:payments.slice(0,3),recentPrescriptions:prescriptions.slice(0,3),recentPatients:patients.slice(0,5),recentDoctors:doctors.slice(0,5),recentDiagnoses:records.filter(r=>r.diagnosis).slice(0,5),availableDoctors:doctors.slice(0,3),
  doctorsCount:doctors.length,recordsCount:records.length,paymentsCount:payments.length,prescriptionCount:prescriptions.length,totalPrescriptions:prescriptions.length,activePrescriptions:count(prescriptions,'status','active'),totalPatients:patients.length,totalVisits:statusCounts.completed,totalAppointments:appointments.length,totalAppointmentsCount:appointments.length,
  pendingPayments,pendingPaymentsCount:pendingPayments.length,paidCount:paid.length,pendingReviewCount:appointments.filter(a=>a.status==='completed'&&!reviews.some(r=>r.appointment_id===a.appointment_id)).length,eligibleReviews:appointments.filter(a=>a.status==='completed'&&!reviews.some(r=>r.appointment_id===a.appointment_id)),
  unreadCount:notifications.filter(n=>!n.is_read).length,groupedNotifications:group(notifications,n=>P.date('F j, Y',P.timestamp(n.created_at))),recordsByYear:group(records,r=>(r.visit_date||'').slice(0,4)),
  allPatients:patients,doctors_result:doctors,specializations:page==='patient/appointment.html'?[...new Set(doctors.map(d=>d.specialization))].map(s=>({specialization:s})):[...new Set(doctors.map(d=>d.specialization))],
  symptomScopes:scopes,scopesByCategory:group(scopes,s=>s.category),totalScopes:scopes.length,activeScopes:scopes.filter(s=>s.is_active).length,emergencyScopes:count(scopes,'urgency_level','emergency'),recentChecks:checks,totalChecks:checks.length,emergencyCount:count(checks,'urgency_level','emergency'),urgentCount:count(checks,'urgency_level','urgent'),routineCount:count(checks,'urgency_level','routine'),patientAge:me.date_of_birth?P.ageParts(me.date_of_birth,today).years:'',
  age:page==='patient/profile.html'?P.ageParts(me.date_of_birth,today):(me.date_of_birth?P.ageParts(me.date_of_birth,today).years:''),today,todayCount:todays.length,currentTime:P.date('H:i:s'),nextAppointment:upcoming[0]||null,
  search:params.get('search')||'',searchQuery:params.get('search')||'',statusFilter:params.get('status')||'all',roleFilter:params.get('role')||'all',dateFilter:params.get('date')||'',dateFrom:params.get('date_from')||'',dateTo:params.get('date_to')||'',filterDate:'',doctorFilter:'',specialization:'',specFilter:'',genderFilter:'',methodFilter:'',filterType:'all',reportType:'overview',
  pendingDoctors:doctors.filter(d=>by(users,'user_id',d.user_id).status==='pending'),activeDoctors:doctors.filter(d=>d.status==='active').length,activePatients:patients.filter(p=>p.status==='active').length,
  recentActivity:[],activityCount:0,allActivities:[],totalActivities:0,totalPages:1,page:1,startPage:1,endPage:1,logs:[],createCount:0,viewCount:0,printCount:0,errorCount:0,submissions:t.contact_submissions||[],appointmentsJson:JSON.stringify(appointments).replaceAll('<','\\u003c'),
  securityQuestions:['What is your mother’s maiden name?','What was the name of your first pet?','What city were you born in?'],days:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],daysOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],selectedDays:[],availableDays:me.available_days||[],availableStart:(me.available_hours||'09:00-17:00').split('-')[0],availableEnd:(me.available_hours||'09:00-17:00').split('-')[1],departments:['Administration','Finance','Operations'],currentDept:me.department||'',
  trendData:{labels:[],appointments:[],revenue:[]},viewingRecord:null,appointment:by(appointments,'appointment_id',params.get('id')),isExpired:false,qrAvailable:false,qrCodeUrl:'',qrCodeUrlDisplay:''
 };
 if(role==='admin'){
  const registration=(row,type)=>{const account=by(users,'user_id',row.user_id);return {type,id:row[type+'_id'],patient_name:type==='patient'?name(row):null,doctor_name:type==='doctor'?name(row):null,status:account.status||row.status||'pending',created_at:account.created_at||row.created_at||null,appointment_date:null,appointment_time:null,profile_image:row.profile_picture||null};};
  const activities=[...appointments.map(a=>({type:'appointment',id:a.appointment_id,patient_name:a.patient_name,doctor_name:a.doctor_name,status:a.status,created_at:a.created_at,appointment_date:a.appointment_date,appointment_time:a.appointment_time,profile_image:null})),...doctors.map(r=>registration(r,'doctor')),...patients.map(r=>registration(r,'patient'))];
  activities.sort((a,b)=>(b.created_at?P.timestamp(b.created_at):0)-(a.created_at?P.timestamp(a.created_at):0)||Number(b.id)-Number(a.id)||a.type.localeCompare(b.type));
  c.recentActivity=activities;c.activityCount=activities.length;
  if(page==='admin/activity.html'){
   c.filterType=['appointment','doctor','patient'].includes(params.get('type'))?params.get('type'):'all';
   const query=(params.get('search')||'').trim().toLowerCase();
   const filtered=activities.filter(a=>{
    const day=a.created_at?P.date('Y-m-d',P.timestamp(a.created_at)):'';
    return (c.filterType==='all'||a.type===c.filterType)&&(!query||((a.patient_name||'')+' '+(a.doctor_name||'')).toLowerCase().includes(query))&&(!c.dateFrom||day>=c.dateFrom)&&(!c.dateTo||day<=c.dateTo);
   });
   c.totalActivities=filtered.length;c.totalPages=Math.max(1,Math.ceil(filtered.length/20));c.page=Math.min(c.totalPages,Math.max(1,parseInt(params.get('page'),10)||1));
   c.startPage=Math.max(1,c.page-2);c.endPage=Math.min(c.totalPages,c.page+2);c.allActivities=filtered.slice((c.page-1)*20,c.page*20);
   c.stats={...c.stats,appointment_count:appointments.length,doctor_count:doctors.length,patient_count:patients.length};
  }
 }
 if(role==='admin'&&page==='admin/reports.html'){
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const dates=appointments.map(a=>a.appointment_date).filter(validDate).sort();
  if(!validDate(c.dateFrom)||!validDate(c.dateTo)){
   c.dateFrom=dates.length?[today,dates[0]].sort()[0]:P.date('Y-m-01');
   c.dateTo=dates.length?[today,dates.at(-1)].sort().at(-1):P.date('Y-m-t');
  }
  if(c.dateFrom>c.dateTo)[c.dateFrom,c.dateTo]=[c.dateTo,c.dateFrom];
  c.reportType=['overview','appointments','doctors'].includes(params.get('report_type'))?params.get('report_type'):'overview';
  const selected=appointments.filter(a=>a.appointment_date>=c.dateFrom&&a.appointment_date<=c.dateTo);
  c.statistics={total_appointments:selected.length,completed_appointments:selected.filter(a=>a.status==='completed').length,cancelled_appointments:selected.filter(a=>a.status==='cancelled').length,total_patients:new Set(selected.map(a=>String(a.patient_id))).size};
  const statuses=new Map(),trend=new Map();
  for(const appointment of selected){
   statuses.set(appointment.status,(statuses.get(appointment.status)||0)+1);
   if(!trend.has(appointment.appointment_date))trend.set(appointment.appointment_date,{date:appointment.appointment_date,completed:0,confirmed:0,pending:0,cancelled:0});
   const row=trend.get(appointment.appointment_date);if(appointment.status in row)row[appointment.status]++;
  }
  c.statuses=[...statuses].map(([status,count])=>({status,count}));
  c.trendData=[...trend.values()].sort((a,b)=>a.date.localeCompare(b.date));
  c.doctors=doctors.map(doctor=>{const visits=selected.filter(a=>String(a.doctor_id)===String(doctor.doctor_id));return {...doctor,appointment_count:visits.length,completed_count:visits.filter(a=>a.status==='completed').length,confirmed_count:visits.filter(a=>a.status==='confirmed').length};}).sort((a,b)=>b.appointment_count-a.appointment_count||name(a).localeCompare(name(b))).slice(0,10);
 }
 if(page==='patient/payment.html'){
  c.appointments=appointments.map(a=>{
   const candidates=payments.filter(p=>String(p.appointment_id)===String(a.appointment_id)).sort((x,y)=>Number(y.payment_id)-Number(x.payment_id));
   const payment=candidates.find(p=>p.payment_status==='completed')||candidates[0]||null;
   const review=reviews.find(r=>String(r.appointment_id)===String(a.appointment_id)&&String(r.patient_id)===String(a.patient_id));
   const paymentStatus=payment?.payment_status||(a.payment_status==='paid'?'unavailable':a.status==='cancelled'?'not_required':a.status==='completed'?'pending':'unpaid');
   return {...a,appointment_status:a.status,payment_id:payment?.payment_id||null,payment_status:paymentStatus,amount:payment?.amount??a.consultation_fee,
    consultation_fee:payment?.amount??a.consultation_fee,review_id:review?.review_id||null,rating:review?.rating||0,review_text:review?.review_text||'',
    payment_label:{completed:'Paid',pending:'Pending',unpaid:'Unpaid',failed:'Failed',refunded:'Refunded',not_required:'Not required',unavailable:'Payment record unavailable'}[paymentStatus]||'Unknown',
    payment_badge:paymentStatus==='completed'?'paid':paymentStatus==='pending'?'pending':paymentStatus==='failed'?'cancelled':paymentStatus};
  });
  c.pendingPayments=c.appointments.filter(a=>a.appointment_status!=='cancelled'&&['pending','failed'].includes(a.payment_status));
  c.pendingPaymentsCount=c.pendingPayments.length;c.pendingCount=c.pendingPayments.length;
  c.paidCount=c.appointments.filter(a=>a.payment_status==='completed').length;
  c.completedCount=c.appointments.filter(a=>a.appointment_status==='completed').length;
  c.eligibleReviews=c.appointments.filter(a=>a.appointment_status==='completed'&&!a.review_id);c.pendingReviewCount=c.eligibleReviews.length;
 }
 if(page==='doctor/patients.html')c.totalVisits=c.patients.reduce((sum,patient)=>sum+patient.total_visits,0);
 if(page==='patient/medicalRecords.html'&&/^\d+$/.test(params.get('record')||'')){
  const record=records.find(r=>String(r.record_id)===params.get('record')&&String(r.patient_id)===String(me.patient_id));
  if(record)c.viewingRecord={...record,appointment_date:record.appointment_date||record.visit_date};
 }
 if(page==='admin/view_contact.html')c.submissions=c.submissions.map(r=>({...r,id:r.contact_id}));
 if(page==='patient/view_qr.html'){
  const a=c.appointment,visit=P.timestamp((a.appointment_date||'')+' '+(a.appointment_time||''));
  c.isExpired=!!visit&&now>visit+3600;
  c.qrAvailable=!!a.qr_code&&a.status==='confirmed'&&now>=visit-86400&&now<=visit+3600;
  if(!c.qrAvailable)c.message=!a.appointment_id?'Appointment not found.':a.status!=='confirmed'?'Confirm the appointment before viewing its QR code.':c.isExpired?'The QR check-in window has expired.':'QR code will be available 24 hours before the appointment.';
 }
 if(page==='doctor/prescription_logs.html'){
  c.logs=(t.prescription_logs||[]).slice().sort((a,b)=>P.timestamp(b.created_at)-P.timestamp(a.created_at)).slice(0,100);
  for(const action of ['create','view','print','error'])c[action+'Count']=c.logs.filter(log=>log.action===action).length;
 }
 // Preserve the original per-page record filters, without altering its markup.
 const search=(params.get('search')||'').toLowerCase(),status=params.get('status');
 if(search)for(const key of ['appointments','medicalRecords','allRecords','doctors','patients','users','payments'])c[key]=c[key].filter(r=>JSON.stringify(r).toLowerCase().includes(search));
 if(status&&status!=='all')for(const key of ['appointments','prescriptions','users'])c[key]=c[key].filter(r=>r.status===status);
 if(params.get('role')&&params.get('role')!=='all')c.users=c.users.filter(r=>r.user_type===params.get('role'));
 if(params.get('patient_id'))for(const key of ['medicalRecords','allRecords','prescriptions'])c[key]=c[key].filter(r=>String(r.patient_id)===params.get('patient_id'));
 if(params.get('doctor_id'))c.appointments=c.appointments.filter(r=>String(r.doctor_id)===params.get('doctor_id'));
 if(params.get('date'))c.appointments=c.appointments.filter(r=>r.appointment_date===params.get('date'));
 if(page==='doctor/medicalRecords.html'){
  c.filterDate=params.get('date')||'';c.filterPatient=params.get('patient_id')||'';
  if(c.filterDate)for(const key of ['medicalRecords','allRecords'])c[key]=c[key].filter(r=>r.visit_date===c.filterDate);
 }
 if(page==='admin/appointments.html'){
  c.doctorFilter=params.get('doctor')||'';
  c.appointments=c.appointments.filter(r=>(!c.doctorFilter||String(r.doctor_id)===c.doctorFilter)&&(!c.dateFrom||r.appointment_date>=c.dateFrom)&&(!c.dateTo||r.appointment_date<=c.dateTo));
 }
 if(page==='admin/billing.html'){
  c.methodFilter=params.get('method')||'';
  c.payments=c.payments.filter(r=>(!status||status==='all'||r.payment_status===status)&&(!c.methodFilter||r.payment_method===c.methodFilter)&&(!c.dateFrom||(r.payment_date||'').slice(0,10)>=c.dateFrom)&&(!c.dateTo||(r.payment_date||'').slice(0,10)<=c.dateTo));
 }
 if(page==='admin/doctors.html'){c.specFilter=params.get('specialization')||'';if(c.specFilter)c.doctors=c.doctors.filter(r=>r.specialization===c.specFilter);}
 if(page==='admin/patients.html'){
  c.genderFilter=params.get('gender')||'';c.bloodTypeFilter=params.get('blood_type')||'';
  c.patients=c.patients.filter(r=>(!c.genderFilter||r.gender===c.genderFilter)&&(!c.bloodTypeFilter||r.blood_type===c.bloodTypeFilter));
  c.stats.blood_types=new Set(patients.map(r=>r.blood_type).filter(Boolean)).size;
 }
 return c;
};
