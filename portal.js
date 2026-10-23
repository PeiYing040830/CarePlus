/* Live Supabase clinic modules. Render database strings as text, never HTML. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { tables: {}, doctors: [], tab: 'overview' };
  let client, profile;
  const configs = {
    appointments: [['appointment_id','ID'],['appointment_date','Date'],['appointment_time','Time'],['doctor_id','Doctor'],['patient_id','Patient ID'],['reason','Reason'],['status','Status'],['payment_status','Payment'],['checked_in_at','Check-in']],
    medical_records: [['record_id','ID'],['visit_date','Visit'],['patient_id','Patient ID'],['doctor_id','Doctor'],['diagnosis','Diagnosis'],['symptoms','Symptoms'],['lab_results','Lab results'],['notes','Notes']],
    prescriptions: [['prescription_id','ID'],['prescription_date','Date'],['patient_id','Patient ID'],['doctor_id','Doctor'],['diagnosis','Diagnosis'],['medications_json','Medications'],['notes','Notes'],['status','Status'],['valid_until','Valid until']],
    payments: [['payment_id','ID'],['appointment_id','Appointment'],['amount','Amount (RM)'],['payment_method','Method'],['payment_status','Status'],['payment_date','Date'],['receipt_number','Receipt']],
    patients: [['patient_id','ID'],['first_name','First name'],['last_name','Last name'],['phone','Phone'],['date_of_birth','Birthday'],['blood_type','Blood type'],['allergies','Allergies']],
    notifications: [['notification_id','ID'],['created_at','Date'],['title','Title'],['message','Message'],['is_read','Read']],
    users: [['user_id','ID'],['email','Email'],['user_type','Role'],['status','Status'],['created_at','Created']],
    contact_submissions: [['contact_id','ID'],['name','Name'],['email','Email'],['phone','Phone'],['subject','Subject'],['message','Message'],['status','Status']],
    clinic_catalog: [['catalog_id','ID'],['item_type','Type'],['name','Name'],['category','Category'],['price','Price (RM)'],['description','Description']],
    symptom_checks: [['symptom_check_id','ID'],['created_at','Date'],['symptoms','Symptoms'],['duration','Duration'],['response','Response']],
    reviews: [['review_id','ID'],['appointment_id','Appointment'],['doctor_id','Doctor'],['rating','Rating'],['review_text','Review'],['created_at','Date']]
  };
  const titles = { overview:'Dashboard', appointments:'Appointments', medical_records:'Medical records', prescriptions:'Prescriptions', payments:'Billing & receipts', patients:'Patients', notifications:'Notifications', users:'Accounts', contact_submissions:'Contact inbox', clinic_catalog:'Clinic catalog', profile:'My profile', symptom_checks:'Symptom journal', reviews:'Reviews', assistant:'Clinic assistant', reports:'Reports' };
  const tabs = {
    patient: ['overview','appointments','medical_records','prescriptions','payments','notifications','profile','symptom_checks','reviews','assistant'],
    doctor: ['overview','appointments','patients','medical_records','prescriptions','clinic_catalog','notifications','profile','assistant'],
    admin: ['overview','appointments','patients','users','medical_records','prescriptions','payments','contact_submissions','clinic_catalog','notifications','reports','profile']
  };
  function el(tag,text,className) { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(className)node.className=className; return node; }
  function notify(message,error=false) { $('portal-status').textContent=message; $('portal-status').classList.toggle('error',error); }
  function display(key,value) {
    if(value===null || value===undefined || value==='')return '—';
    if(key==='doctor_id')return state.doctors.find(d=>d.doctor_id===value)?.name || '#'+value;
    if(typeof value==='object')return JSON.stringify(value);
    if(['amount','price'].includes(key))return Number(value).toFixed(2);
    if(key==='is_read')return value ? 'Yes' : 'No';
    if(/_at$|_date$/.test(key) && String(value).includes('T'))return new Date(value).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'});
    return String(value);
  }
  async function query(table) {
    const {data,error}=await client.from(table).select('*').order(configs[table]?.[0]?.[0] || 'created_at',{ascending:false}).limit(1000);
    if(error)throw error; return data;
  }
  async function refresh() {
    $('refresh').disabled=true;
    try {
      const tableNames=tabs[profile.role].filter(t=>configs[t]);
      if(!tableNames.includes('patients'))tableNames.push('patients');
      const results=await Promise.all(tableNames.map(async t=>[t,await query(t)]));
      const doctors=await client.rpc('careplus_doctors'); if(doctors.error)throw doctors.error;
      state.tables=Object.fromEntries(results); state.doctors=doctors.data || [];
      render(); notify('Live data refreshed. Times are shown in Malaysia time. Lists show up to 1,000 records.');
    } catch(error) { notify(error.message,true); }
    finally { $('refresh').disabled=false; }
  }
  async function action(name,data,button) {
    if(button)button.disabled=true;
    try {
      const result=await client.rpc('careplus_action',{p_action:name,p_data:data});
      if(result.error)throw result.error;
      await refresh(); notify('Saved successfully.'); return result.data;
    } catch(error) { notify(error.message,true); return null; }
    finally { if(button)button.disabled=false; }
  }
  function button(text,fn,className='') { const b=el('button',text,className); b.type='button'; b.addEventListener('click',()=>fn(b)); return b; }
  function form(fields,label,fn) {
    const f=el('form',undefined,'clinic-form');
    for(const spec of fields) {
      const wrap=el('label',spec.label); let input;
      if(spec.options) { input=el('select'); for(const [value,text] of spec.options) {const opt=el('option',text); opt.value=value; input.append(opt);} }
      else input=el(spec.type==='textarea'?'textarea':'input');
      if(input.tagName==='INPUT')input.type=spec.type||'text';
      input.name=spec.name; input.required=spec.required!==false;
      if(spec.value!==undefined)input.value=spec.value??'';
      for(const key of ['min','max','step','maxLength'])if(spec[key]!==undefined)input[key]=spec[key];
      wrap.append(input); f.append(wrap);
    }
    const submit=el('button',label); submit.type='submit'; f.append(submit);
    f.addEventListener('submit',async event=>{event.preventDefault(); await fn(Object.fromEntries(new FormData(f)),submit,f);});
    return f;
  }
  function table(name,rows=state.tables[name] || []) {
    if(!rows.length)return el('p','No records yet.','empty');
    const wrap=el('div',undefined,'table-scroll'); const t=el('table'); const head=el('tr');
    for(const [,title] of configs[name])head.append(el('th',title));
    head.append(el('th','Actions')); const thead=el('thead'); thead.append(head); t.append(thead);
    const body=el('tbody');
    for(const row of rows) {
      const tr=el('tr'); for(const [key] of configs[name])tr.append(el('td',display(key,row[key])));
      const td=el('td',undefined,'row-actions');
      if(name==='appointments') {
        if(row.status==='pending')td.append(button('Confirm',b=>action('confirm',{appointment_id:row.appointment_id},b)));
        if(['pending','confirmed'].includes(row.status)) {
          td.append(button('Cancel',b=>{if(confirm('Cancel this appointment?'))action('cancel',{appointment_id:row.appointment_id},b);},'secondary'));
          if(profile.role==='patient')td.append(button('Reschedule',()=>booking(row)));
        }
        if(profile.role!=='patient' && row.status==='confirmed') {
          if(!row.checked_in_at)td.append(button('Check in',b=>action('checkin',{appointment_id:row.appointment_id},b)));
          else td.append(button('Complete',b=>action('complete',{appointment_id:row.appointment_id},b)));
        }
        if(row.qr_code)td.append(button('Check-in reference',()=>notify('Appointment #'+row.appointment_id+' · Reference: '+row.qr_code)));
      }
      if(name==='notifications' && !row.is_read)td.append(button('Mark read',b=>action('read_notification',{notification_id:row.notification_id},b)));
      if(name==='users' && row.user_id!==profile.legacy_user_id) {
        td.append(button(row.status==='active'?'Suspend':'Activate',b=>{if(confirm('Change this account status?'))action('user_status',{user_id:row.user_id,status:row.status==='active'?'suspended':'active'},b);}));
      }
      if(name==='contact_submissions' && row.status!=='closed')td.append(button('Close',b=>action('close_contact',{contact_id:row.contact_id},b)));
      if(name==='payments' && row.payment_status==='completed')td.append(button('Print receipt',()=>printReceipt(row)));
      tr.append(td); body.append(tr);
    }
    t.append(body); wrap.append(t); return wrap;
  }
  function printReceipt(row) {
    const receipt=$('receipt'); receipt.replaceChildren(el('h1','CarePlus payment receipt'));
    for(const key of ['receipt_number','payment_date','appointment_id','patient_id','amount','payment_method'])receipt.append(el('p',key.replaceAll('_',' ')+': '+display(key,row[key])));
    window.print();
  }
  function appointmentOptions(statuses=['confirmed','completed']) {
    return (state.tables.appointments || []).filter(a=>statuses.includes(a.status)).map(a=>[a.appointment_id,'#'+a.appointment_id+' · '+a.appointment_date+' · Patient #'+a.patient_id]);
  }
  function booking(existing=null) {
    const mount=$('module-form'); mount.replaceChildren(el('h2',existing?'Reschedule appointment #'+existing.appointment_id:'Book appointment'));
    if(!state.doctors.length) {mount.append(el('p','No active doctors are available.'));return;}
    const f=form([
      {name:'doctor_id',label:'Doctor',options:state.doctors.map(d=>[d.doctor_id,d.name+' · '+d.specialization]),value:existing?.doctor_id},
      {name:'date',label:'Date',type:'date',value:existing?.appointment_date},
      {name:'time',label:'Available time',options:[['','Choose a doctor and date']]},
      {name:'reason',label:'Reason for visit',type:'textarea',value:existing?.reason,maxLength:2000}
    ],existing?'Reschedule':'Book appointment',async(data,b)=>{if(existing)data.appointment_id=existing.appointment_id;await action(existing?'reschedule':'book',data,b);});
    const date=f.elements.date, doctor=f.elements.doctor_id, time=f.elements.time, submit=f.querySelector('[type="submit"]');
    date.min=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    let version=0;
    async function slots() {
      const request=++version; submit.disabled=true; time.replaceChildren();
      if(!date.value)return;
      const result=await client.rpc('careplus_slots',{p_doctor:Number(doctor.value),p_date:date.value});
      if(request!==version)return;
      if(result.error){notify(result.error.message,true);return;}
      const placeholder=el('option','Select a time'); placeholder.value=''; time.append(placeholder);
      for(const slot of result.data || [])if(slot.available || (existing && doctor.value===String(existing.doctor_id) && date.value===existing.appointment_date && slot.slot===existing.appointment_time)) {
        const opt=el('option',slot.slot.slice(0,5)); opt.value=slot.slot; time.append(opt);
      }
      submit.disabled=time.options.length<2;
      if(submit.disabled)notify('No available slots for this doctor and date.');
    }
    date.addEventListener('change',slots); doctor.addEventListener('change',slots); submit.disabled=true;
    mount.append(f); if(existing)slots(); mount.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function clinicalForm(prescribe) {
    const options=appointmentOptions(); if(!options.length)return el('p','You need an assigned confirmed or completed appointment to enter clinical information.');
    const fields=[{name:'appointment_id',label:'Appointment',options},{name:'diagnosis',label:'Diagnosis',maxLength:500}];
    if(prescribe)fields.push({name:'medications',label:'Medications — one per line: name | dose | frequency | duration',type:'textarea'});
    else fields.push({name:'symptoms',label:'Symptoms',type:'textarea',required:false},{name:'lab_results',label:'Lab results',type:'textarea',required:false});
    fields.push({name:'notes',label:'Notes',type:'textarea',required:false,maxLength:4000});
    return form(fields,prescribe?'Save prescription':'Add medical record',async(data,b)=>{
      if(prescribe)data.medications=data.medications.split('\n').filter(line=>line.trim()).map(line=>{const [name,dosage,frequency,duration]=line.split('|').map(s=>s.trim());return {name,dosage,frequency,duration};});
      await action(prescribe?'prescribe':'record',data,b);
    });
  }
  function exportCSV(name) {
    const rows=state.tables[name] || []; const cols=configs[name];
    // Protect spreadsheet exports from formula execution.
    const cell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
    const csv=[cols.map(c=>cell(c[1])).join(','),...rows.map(r=>cols.map(([key])=>cell(display(key,r[key]))).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); const a=el('a');a.href=url;a.download='careplus-'+name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render() {
    const key=state.tab; $('module-title').textContent=titles[key]; $('module-form').replaceChildren(); $('module-data').replaceChildren();
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===key));
    const mount=$('module-data'); const forms=$('module-form');
    if(key==='overview' || key==='reports') {
      const grid=el('div',undefined,'demo-grid');
      for(const t of ['appointments','patients','medical_records','prescriptions','payments','notifications'])if(state.tables[t]) {
        const card=el('section',undefined,'demo-card');card.append(el('h2',String(state.tables[t].length)),el('p',titles[t]));grid.append(card);
      }
      mount.append(grid);
      const appointments=state.tables.appointments || [];
      const revenue=(state.tables.payments||[]).filter(p=>p.payment_status==='completed').reduce((sum,p)=>sum+Number(p.amount),0);
      mount.append(el('p','Pending appointments: '+appointments.filter(a=>a.status==='pending').length+' · Confirmed: '+appointments.filter(a=>a.status==='confirmed').length+' · Recorded payments: RM '+revenue.toFixed(2)));
      if(key==='reports')for(const t of ['appointments','payments','patients'])mount.append(button('Export '+titles[t],()=>exportCSV(t),'secondary'));
      else mount.append(table('appointments',appointments.slice(0,5)));
    } else if(key==='profile') {
      const patient=(state.tables.patients||[]).find(p=>p.user_id===profile.legacy_user_id) || {};
      const fields=[{name:'display_name',label:'Display name',value:profile.display_name,maxLength:100}];
      if(profile.role==='patient')for(const [name,label] of [['phone','Phone'],['address','Address'],['emergency_contact','Emergency contact'],['blood_type','Blood type'],['allergies','Allergies']])fields.push({name,label,value:patient[name],required:false});
      forms.append(form(fields,'Save profile',async(data,b)=>{const result=await action('profile',data,b);if(result){profile.display_name=data.display_name;$('account-name').textContent=data.display_name;}}));
      mount.append(el('p','Role: '+profile.role+' · Email: '+state.user.email));
      const upload=el('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp,image/gif';upload.setAttribute('aria-label','Upload profile image');
      mount.append(el('h2','Profile image'),upload,button('Upload image',async b=>{
        const file=upload.files[0];if(!file){notify('Choose an image first.',true);return;}
        if(file.size>5242880 || !['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){notify('Choose a PNG, JPEG, WebP or GIF up to 5 MB.',true);return;}
        b.disabled=true;
        try{
          const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[file.type];
          const objectPath=state.user.id+'/'+crypto.randomUUID()+'.'+extension;
          const result=await client.storage.from('careplus-uploads').upload(objectPath,file,{contentType:file.type});if(result.error)throw result.error;
          const saved=await action('avatar',{path:objectPath},b);
          if(saved){const signed=await client.storage.from('careplus-uploads').createSignedUrl(objectPath,300);if(signed.error)throw signed.error;const img=el('img');img.src=signed.data.signedUrl;img.alt='Your profile image';img.style.maxWidth='160px';mount.append(img);}
        }catch(e){notify(e.message,true);}finally{b.disabled=false;}
      }));
      if(patient.profile_picture && patient.profile_picture.startsWith(state.user.id+'/')) {
        const image=el('img');image.alt='Your profile image';image.style.maxWidth='160px';mount.append(image);
        client.storage.from('careplus-uploads').createSignedUrl(patient.profile_picture,300).then(({data,error})=>{if(!error)image.src=data.signedUrl;});
      }
    } else if(key==='assistant') {
      mount.append(el('p','Clinic information only. This assistant does not diagnose or prescribe.'));
      forms.append(form([{name:'message',label:'Your question',type:'textarea',maxLength:1000}],'Send',async(data,b)=>{
        b.disabled=true;try{const {data:answer,error}=await client.rpc('careplus_action',{p_action:'chat',p_data:data});if(error)throw error;mount.append(el('p','You: '+data.message),el('p','CarePlus: '+answer.response));}catch(e){notify(e.message,true);}finally{b.disabled=false;}
      }));
    } else {
      if(key==='appointments' && profile.role==='patient')booking();
      if(['medical_records','prescriptions'].includes(key) && profile.role==='doctor')forms.append(clinicalForm(key==='prescriptions'));
      if(key==='payments' && profile.role==='admin')forms.append(form([
        {name:'appointment_id',label:'Appointment',options:appointmentOptions(['pending','confirmed','completed'])},
        {name:'amount',label:'Verified amount received (RM)',type:'number',min:0.01,max:100000,step:0.01},
        {name:'method',label:'Payment method',options:[['cash','Cash'],['card','Card — processed externally'],['online','Online — processed externally']]},
        {name:'reference',label:'Transaction reference',required:false,maxLength:100}
      ],'Record verified payment',(data,b)=>action('payment',data,b)));
      if(key==='users' && profile.role==='admin') {
        forms.append(el('h2','Set up or update a doctor'));
        forms.append(form([{name:'user_id',label:'Existing account',options:(state.tables.users||[]).filter(u=>u.user_type!=='admin').map(u=>[u.user_id,u.email])},{name:'name',label:'Doctor name',maxLength:100},{name:'license_number',label:'License number',maxLength:50},{name:'specialization',label:'Specialization',maxLength:100},{name:'phone',label:'Phone',maxLength:20},{name:'fee',label:'Consultation fee (RM)',type:'number',min:0,step:0.01}],'Save authorized doctor',(data,b)=>{if(confirm('Authorize this account as a doctor?'))return action('doctor_setup',data,b);}));
      }
      if(key==='symptom_checks') {
        forms.append(el('p','Keep a symptom journal for your consultation. Entries are not an automated diagnosis or triage.'));
        forms.append(form([{name:'symptoms',label:'Symptoms',type:'textarea',maxLength:4000},{name:'duration',label:'Duration',required:false,maxLength:100},{name:'additional_info',label:'Additional information',type:'textarea',required:false,maxLength:4000}],'Save journal entry',(data,b)=>action('symptom_log',data,b)));
      }
      if(key==='reviews')forms.append(form([{name:'appointment_id',label:'Completed appointment',options:appointmentOptions(['completed'])},{name:'rating',label:'Rating',options:[1,2,3,4,5].map(n=>[n,n+' / 5'])},{name:'review_text',label:'Review',type:'textarea',required:false,maxLength:2000}],'Submit review',(data,b)=>action('review',data,b)));
      if(key==='clinic_catalog' && profile.role==='admin')forms.append(form([{name:'item_type',label:'Type',options:['medicine','lab_test','procedure'].map(t=>[t,t])},{name:'name',label:'Name',maxLength:255},{name:'price',label:'Price (RM)',type:'number',min:0,step:0.01},{name:'category',label:'Category',required:false},{name:'description',label:'Description',required:false,type:'textarea'}],'Add catalog item',(data,b)=>action('catalog',data,b)));
      const filter=el('input');filter.type='search';filter.placeholder='Search these records';filter.setAttribute('aria-label','Search records');
      const list=el('div');list.append(table(key));filter.addEventListener('input',()=>{const term=filter.value.toLowerCase();list.replaceChildren(table(key,(state.tables[key]||[]).filter(row=>configs[key].some(([k])=>display(k,row[k]).toLowerCase().includes(term)))));});
      mount.append(filter,list);
    }
  }
  window.addEventListener('careplus-ready',event=>{
    ({client,profile}=event.detail);state.user=event.detail.user;
    const nav=$('portal-nav');nav.replaceChildren();
    for(const key of tabs[profile.role]) {const b=button(titles[key],()=>{state.tab=key;render();});b.dataset.tab=key;nav.append(b);}
    $('refresh').addEventListener('click',refresh);refresh();
  });
})();
