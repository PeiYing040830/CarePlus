begin;

-- Imported historical rows retain their original numeric identifiers.
-- New writes enforce relationships; NOT VALID preserves any old orphan rows for review.
do $$ declare r record; begin
  for r in select * from (values
    ('patients','user_id','users','user_id'),('doctors','user_id','users','user_id'),('admins','user_id','users','user_id'),
    ('appointments','patient_id','patients','patient_id'),('appointments','doctor_id','doctors','doctor_id'),
    ('medical_records','patient_id','patients','patient_id'),('medical_records','doctor_id','doctors','doctor_id'),('medical_records','appointment_id','appointments','appointment_id'),
    ('prescriptions','patient_id','patients','patient_id'),('prescriptions','doctor_id','doctors','doctor_id'),('prescriptions','appointment_id','appointments','appointment_id'),
    ('payments','patient_id','patients','patient_id'),('payments','appointment_id','appointments','appointment_id'),
    ('notifications','user_id','users','user_id'),('reviews','appointment_id','appointments','appointment_id'),
    ('reviews','patient_id','patients','patient_id'),('reviews','doctor_id','doctors','doctor_id'),
    ('symptom_checks','user_id','users','user_id'),('symptom_checks','patient_id','patients','patient_id'),
    ('chatbot_logs','patient_id','patients','patient_id'),('qr_event_logs','appointment_id','appointments','appointment_id')
  ) as links(tbl,col,target,pk) loop
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I(%I) not valid',r.tbl,r.tbl||'_'||r.col||'_fk',r.col,r.target,r.pk);
  end loop;
end $$;

-- Account and actor identifiers come from trusted profile mappings, never metadata.
create function public.careplus_user_id() returns bigint language sql stable security definer set search_path = '' as $$
  select u.user_id from public.profiles p join public.users u on u.user_id=p.legacy_user_id
  where p.id=auth.uid() and u.status='active' and u.is_active=1
$$;
create function public.careplus_role() returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id=auth.uid() and public.careplus_user_id() is not null
$$;
create function public.careplus_patient_id() returns bigint language sql stable security definer set search_path = '' as $$
  select patient_id from public.patients where user_id=public.careplus_user_id()
$$;
create function public.careplus_doctor_id() returns bigint language sql stable security definer set search_path = '' as $$
  select doctor_id from public.doctors where user_id=public.careplus_user_id()
$$;
create function public.careplus_can_treat(p_patient bigint) returns boolean language sql stable security definer set search_path = '' as $$
  select public.careplus_role()='admin' or exists(select 1 from public.appointments a
    where a.patient_id=p_patient and a.doctor_id=public.careplus_doctor_id() and a.status in ('confirmed','completed'))
$$;

-- Select-only table access. All writes use validated transactional operations below.
do $$ declare t text; begin
  foreach t in array array['users','admins','patients','doctors','appointments','medical_records','prescriptions','payments','notifications','reviews','clinic_catalog','symptom_scope','symptom_checks','chatbot_knowledge','chatbot_logs','contact_submissions','qr_event_logs'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select public.careplus_role()) = ''admin'')',t);
  end loop;
end $$;
create policy users_own on public.users for select to authenticated using (user_id=(select public.careplus_user_id()));
create policy admins_own on public.admins for select to authenticated using (user_id=(select public.careplus_user_id()));
create policy patients_related on public.patients for select to authenticated using (user_id=(select public.careplus_user_id()) or public.careplus_can_treat(patient_id));
create policy doctors_signedin on public.doctors for select to authenticated using (user_id=(select public.careplus_user_id()));
create policy appointments_related on public.appointments for select to authenticated using (patient_id=(select public.careplus_patient_id()) or doctor_id=(select public.careplus_doctor_id()));
create policy records_related on public.medical_records for select to authenticated using (patient_id=(select public.careplus_patient_id()) or (doctor_id=(select public.careplus_doctor_id()) and public.careplus_can_treat(patient_id)));
create policy prescriptions_related on public.prescriptions for select to authenticated using (patient_id=(select public.careplus_patient_id()) or (doctor_id=(select public.careplus_doctor_id()) and public.careplus_can_treat(patient_id)));
create policy payments_own on public.payments for select to authenticated using (patient_id=(select public.careplus_patient_id()));
create policy notifications_own on public.notifications for select to authenticated using (user_id=(select public.careplus_user_id()));
create policy reviews_own on public.reviews for select to authenticated using (patient_id=(select public.careplus_patient_id()) or doctor_id=(select public.careplus_doctor_id()));
create policy catalog_active on public.clinic_catalog for select to authenticated using (is_active=1 and public.careplus_user_id() is not null);
create policy scope_active on public.symptom_scope for select to authenticated using (is_active=1 and public.careplus_user_id() is not null);
create policy symptoms_own on public.symptom_checks for select to authenticated using (user_id=(select public.careplus_user_id()));
create policy chat_own on public.chatbot_logs for select to authenticated using (patient_id=(select public.careplus_patient_id()));
create policy knowledge_read on public.chatbot_knowledge for select to authenticated using (is_active=1 and rule_type='allowed' and public.careplus_user_id() is not null);
create policy qr_staff on public.qr_event_logs for select to authenticated using (doctor_id=(select public.careplus_doctor_id()));
create policy profiles_admin on public.profiles for select to authenticated using ((select public.careplus_role())='admin');

-- Public directory deliberately excludes phone, IC, birthday, license and upload paths.
create function public.careplus_doctors() returns table(doctor_id bigint, name text, specialization text, bio text, consultation_fee numeric, available_days jsonb, available_hours text, experience_years bigint)
language sql stable security definer set search_path = '' as $$
  select d.doctor_id,concat_ws(' ',d.first_name,d.last_name),d.specialization,d.bio,d.consultation_fee,d.available_days,d.available_hours,d.experience_years
  from public.doctors d join public.users u on u.user_id=d.user_id
  where d.status='active' and u.status='active' and u.is_active=1
$$;

create unique index users_email_unique on public.users(lower(email));
create unique index patients_user_unique on public.patients(user_id);
create unique index doctors_user_unique on public.doctors(user_id);
create index appointments_patient_idx on public.appointments(patient_id);
create index appointments_doctor_idx on public.appointments(doctor_id,appointment_date);
create index notifications_user_idx on public.notifications(user_id,created_at desc);
create index records_patient_idx on public.medical_records(patient_id);
create index prescriptions_patient_idx on public.prescriptions(patient_id);
create index payments_patient_idx on public.payments(patient_id);

-- Signup creates real business rows atomically, with a non-privileged role.
alter table public.patients alter column ic_number drop not null;
alter table public.patients alter column date_of_birth drop not null;
alter table public.patients alter column gender drop not null;
create or replace function public.careplus_create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare uid bigint; n text := left(coalesce(new.raw_user_meta_data->>'display_name',''),100);
begin
  insert into public.users(email,user_type) values(new.email,'patient') returning user_id into uid;
  insert into public.patients(user_id,first_name,last_name,phone) values(uid,n,'','');
  insert into public.profiles(id,display_name,role,legacy_user_id) values(new.id,n,'patient',uid);
  return new;
end $$;

create function public.careplus_slots(p_doctor bigint,p_date date) returns table(slot time,available boolean)
language sql stable security definer set search_path = '' as $$
  select s::time,not exists(select 1 from public.appointments a where a.doctor_id=p_doctor and a.appointment_date=p_date and a.appointment_time=s::time and a.status in ('pending','confirmed'))
  from generate_series(timestamp '2000-01-01 09:00',timestamp '2000-01-01 16:30',interval '30 minutes') s
  where p_date between (now() at time zone 'Asia/Kuala_Lumpur')::date and (now() at time zone 'Asia/Kuala_Lumpur')::date+180
    and exists(select 1 from public.doctors d join public.users u on u.user_id=d.user_id where d.doctor_id=p_doctor and d.status='active' and u.status='active' and u.is_active=1
      and (d.available_days is null or d.available_days ? trim(to_char(p_date,'Day')))
      and (coalesce(d.available_hours,'') !~ '^\d{2}:\d{2}-\d{2}:\d{2}$' or (s::time>=split_part(d.available_hours,'-',1)::time and s::time+interval '30 minutes'<=split_part(d.available_hours,'-',2)::time)))
$$;

create function public.careplus_action(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid bigint := public.careplus_user_id(); role_name text := public.careplus_role();
  pid bigint := public.careplus_patient_id(); did bigint := public.careplus_doctor_id();
  aid bigint; rid bigint; a public.appointments; d public.doctors; target_date date; target_time time;
  target_uid bigint; target_role text; n text; amount numeric;
begin
  if pg_column_size(p_data)>65536 then raise exception 'Request is too large.'; end if;
  if p_action='contact' then
    if length(coalesce(p_data->>'name','')) not between 1 and 100 or length(coalesce(p_data->>'email','')) not between 3 and 254 or position('@' in p_data->>'email')<2 or length(coalesce(p_data->>'message','')) not between 1 and 4000 then raise exception 'Enter a valid name, email and message (maximum 4000 characters).'; end if;
    perform pg_advisory_xact_lock(982347);
    if (select count(*) from public.contact_submissions where created_at>now()-interval '1 minute')>=10 then raise exception 'Please try again later.'; end if;
    insert into public.contact_submissions(name,email,phone,subject,message) values(left(p_data->>'name',100),p_data->>'email',left(p_data->>'phone',20),left(coalesce(p_data->>'subject','general'),100),p_data->>'message') returning contact_id into rid;
    return jsonb_build_object('id',rid);
  end if;
  if uid is null then raise exception 'Sign in with an active account first.'; end if;
  if p_action in ('book','reschedule') then
    if role_name<>'patient' or pid is null then raise exception 'Patient account required.'; end if;
    perform 1 from public.patients where patient_id=pid for update;
    if p_action='reschedule' then
      select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
      if not found or a.patient_id<>pid or a.status not in ('pending','confirmed') then raise exception 'Appointment cannot be rescheduled.'; end if;
    end if;
    select * into d from public.doctors where doctor_id=(p_data->>'doctor_id')::bigint for update;
    if not found or d.status<>'active' or not exists(select 1 from public.users where user_id=d.user_id and status='active' and is_active=1) then raise exception 'Doctor is unavailable.'; end if;
    target_date := (p_data->>'date')::date; target_time := (p_data->>'time')::time;
    if target_date is null or target_time is null or (target_date+target_time) at time zone 'Asia/Kuala_Lumpur' <= now() or target_date>(now() at time zone 'Asia/Kuala_Lumpur')::date+180 or target_time<time '09:00' or target_time>time '16:30' or extract(minute from target_time)::int%30<>0 or extract(second from target_time)<>0 then raise exception 'Choose a future 30-minute clinic slot within 180 days (09:00–16:30).'; end if;
    if d.available_days is not null and not (d.available_days ? trim(to_char(target_date,'Day'))) then raise exception 'Doctor is unavailable on this day.'; end if;
    if coalesce(d.available_hours,'') ~ '^\d{2}:\d{2}-\d{2}:\d{2}$' and (target_time<split_part(d.available_hours,'-',1)::time or target_time+interval '30 minutes'>split_part(d.available_hours,'-',2)::time) then raise exception 'Choose a time within the doctor schedule.'; end if;
    -- Lock the doctor row to serialize competing bookings, including old duplicated slots.
    if exists(select 1 from public.appointments where doctor_id=d.doctor_id and appointment_date=target_date and appointment_time=target_time and status in ('pending','confirmed') and (p_action='book' or appointment_id<>a.appointment_id)) then raise exception 'This time is already booked.'; end if;
    if exists(select 1 from public.appointments where patient_id=pid and appointment_date=target_date and appointment_time=target_time and status in ('pending','confirmed') and (p_action='book' or appointment_id<>a.appointment_id)) then raise exception 'You already have an appointment at this time.'; end if;
    if p_action='book' then
      if length(coalesce(p_data->>'reason','')) not between 1 and 2000 then raise exception 'Enter a reason (maximum 2000 characters).'; end if;
      insert into public.appointments(patient_id,doctor_id,appointment_date,appointment_time,reason,symptoms,qr_code,confirmation_deadline)
      values(pid,d.doctor_id,target_date,target_time,p_data->>'reason',left(p_data->>'symptoms',4000),gen_random_uuid()::text,least(now()+interval '24 hours',(target_date+target_time) at time zone 'Asia/Kuala_Lumpur')) returning appointment_id into aid;
    else
      update public.appointments set doctor_id=d.doctor_id,appointment_date=target_date,appointment_time=target_time,status='pending',confirmed_at=null,checked_in_at=null,qr_code=gen_random_uuid()::text,confirmation_deadline=least(now()+interval '24 hours',(target_date+target_time) at time zone 'Asia/Kuala_Lumpur'),updated_at=now() where appointment_id=a.appointment_id returning appointment_id into aid;
    end if;
    insert into public.notifications(user_id,notification_type,title,message) values(uid,'appointment','Appointment saved','Appointment #'||aid||' on '||target_date||' at '||target_time);
    return jsonb_build_object('id',aid);
  elsif p_action in ('confirm','cancel','checkin','complete') then
    select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
    if not found or not coalesce((role_name='admin' or (role_name='patient' and a.patient_id=pid) or (role_name='doctor' and a.doctor_id=did)),false) then raise exception 'Appointment not found.'; end if;
    if a.status not in ('pending','confirmed') then raise exception 'This appointment is already closed.'; end if;
    if p_action='cancel' then
      update public.appointments set status='cancelled',updated_at=now() where appointment_id=a.appointment_id;
    elsif p_action='confirm' then
      if a.status<>'pending' or (a.appointment_date+a.appointment_time) at time zone 'Asia/Kuala_Lumpur' <= now() then raise exception 'This appointment cannot be confirmed.'; end if;
      update public.appointments set status='confirmed',confirmed_at=now(),updated_at=now() where appointment_id=a.appointment_id;
    elsif p_action='checkin' then
      if role_name not in ('doctor','admin') or a.status<>'confirmed' or a.appointment_date<>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Staff can check in confirmed appointments on the visit date.'; end if;
      update public.appointments set checked_in_at=now(),checked_in_by=uid,updated_at=now() where appointment_id=a.appointment_id;
      insert into public.qr_event_logs(appointment_id,qr_code,event_type,doctor_id,status) values(a.appointment_id,coalesce(a.qr_code,''),'scanned',coalesce(did,a.doctor_id),'checked_in');
    else
      if role_name not in ('doctor','admin') or a.status<>'confirmed' or a.checked_in_at is null then raise exception 'Staff must check in the appointment before completion.'; end if;
      update public.appointments set status='completed',updated_at=now() where appointment_id=a.appointment_id;
    end if;
    select user_id into target_uid from public.patients where patient_id=a.patient_id;
    insert into public.notifications(user_id,notification_type,title,message) values(target_uid,'appointment','Appointment updated','Appointment #'||a.appointment_id||': '||p_action);
    return jsonb_build_object('id',a.appointment_id);
  elsif p_action in ('record','prescribe') then
    select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
    if not found or role_name<>'doctor' or a.doctor_id is distinct from did or a.status not in ('confirmed','completed') then raise exception 'Only the assigned doctor can enter clinical information.'; end if;
    if length(coalesce(p_data->>'diagnosis','')) not between 1 and 500 then raise exception 'Enter diagnosis (maximum 500 characters).'; end if;
    if p_action='record' then
      insert into public.medical_records(patient_id,doctor_id,appointment_id,visit_date,diagnosis,symptoms,lab_results,notes)
      values(a.patient_id,did,a.appointment_id,a.appointment_date,p_data->>'diagnosis',left(p_data->>'symptoms',4000),left(p_data->>'lab_results',4000),left(p_data->>'notes',4000)) returning record_id into rid;
    else
      if jsonb_typeof(p_data->'medications') is distinct from 'array' then raise exception 'Enter medications as an array.'; end if;
      if jsonb_array_length(p_data->'medications')<1 or jsonb_array_length(p_data->'medications')>30 then raise exception 'Enter 1–30 medications.'; end if;
      insert into public.prescriptions(patient_id,doctor_id,appointment_id,diagnosis,notes,medications_json,verification_code,valid_until)
      values(a.patient_id,did,a.appointment_id,p_data->>'diagnosis',left(p_data->>'notes',4000),p_data->'medications',left(gen_random_uuid()::text,20),(now() at time zone 'Asia/Kuala_Lumpur')::date+30) returning prescription_id into rid;
    end if;
    return jsonb_build_object('id',rid);
  elsif p_action='payment' then
    if role_name<>'admin' then raise exception 'Only administrators can record verified payments.'; end if;
    select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
    amount := (p_data->>'amount')::numeric;
    if not found or a.status='cancelled' or a.payment_status='paid' or amount is null or amount<=0 or amount>100000 then raise exception 'Invalid appointment or payment amount.'; end if;
    if coalesce(p_data->>'method','') not in ('cash','card','online') then raise exception 'Invalid payment method.'; end if;
    insert into public.payments(patient_id,appointment_id,amount,payment_method,payment_status,receipt_number,transaction_id)
    values(a.patient_id,a.appointment_id,amount,p_data->>'method','completed','CP-'||gen_random_uuid()::text,left(p_data->>'reference',100)) returning payment_id into rid;
    update public.appointments set payment_status='paid',updated_at=now() where appointment_id=a.appointment_id;
    return jsonb_build_object('id',rid);
  elsif p_action='profile' then
    n := trim(p_data->>'display_name');
    if n is null or length(n) not between 1 and 100 then raise exception 'Enter a display name.'; end if;
    update public.profiles set display_name=n where id=auth.uid();
    if role_name='patient' then update public.patients set first_name=n,last_name='',phone=left(p_data->>'phone',20),address=left(p_data->>'address',1000),emergency_contact=left(p_data->>'emergency_contact',50),allergies=left(p_data->>'allergies',2000),blood_type=left(p_data->>'blood_type',5) where user_id=uid; end if;
    return jsonb_build_object('ok',true);
  elsif p_action='avatar' then
    n := p_data->>'path';
    if n is null or split_part(n,'/',1)<>auth.uid()::text or position('..' in n)>0 then raise exception 'Invalid upload path.'; end if;
    if not exists(select 1 from storage.objects where bucket_id='careplus-uploads' and name=n) then raise exception 'Upload not found.'; end if;
    if role_name='patient' then update public.patients set profile_picture=n where user_id=uid;
    elsif role_name='doctor' then update public.doctors set profile_picture=n where user_id=uid;
    else update public.admins set profile_picture=n where user_id=uid; end if;
    return jsonb_build_object('ok',true);
  elsif p_action='read_notification' then
    update public.notifications set is_read=1 where notification_id=(p_data->>'notification_id')::bigint and user_id=uid;
    return jsonb_build_object('ok',true);
  elsif p_action='review' then
    select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
    if not found or role_name<>'patient' or a.patient_id is distinct from pid or a.status<>'completed' or coalesce((p_data->>'rating')::int,0) not between 1 and 5 or exists(select 1 from public.reviews where appointment_id=a.appointment_id) then raise exception 'Choose a completed appointment without an existing review and a rating of 1–5.'; end if;
    insert into public.reviews(doctor_id,patient_id,appointment_id,rating,review_text) values(a.doctor_id,pid,a.appointment_id,(p_data->>'rating')::int,left(p_data->>'review_text',2000)) returning review_id into rid;
    return jsonb_build_object('id',rid);
  elsif p_action='symptom_log' then
    if role_name<>'patient' or pid is null or length(coalesce(p_data->>'symptoms','')) not between 1 and 4000 then raise exception 'Patient account and symptoms required.'; end if;
    insert into public.symptom_checks(user_id,patient_id,symptoms,duration,additional_info,response)
    values(uid,pid,p_data->>'symptoms',left(p_data->>'duration',100),left(p_data->>'additional_info',4000),'Self-reported symptoms; no automated diagnosis performed.') returning symptom_check_id into rid;
    return jsonb_build_object('id',rid);
  elsif p_action='user_status' then
    if role_name<>'admin' then raise exception 'Administrator required.'; end if;
    target_uid := (p_data->>'user_id')::bigint;
    if target_uid=uid then raise exception 'You cannot suspend yourself.'; end if;
    if coalesce(p_data->>'status','') not in ('active','pending','suspended','inactive') then raise exception 'Invalid account status.'; end if;
    update public.users set status=p_data->>'status',is_active=case when p_data->>'status'='active' then 1 else 0 end where user_id=target_uid;
    return jsonb_build_object('ok',true);
  elsif p_action='doctor_setup' then
    if role_name<>'admin' then raise exception 'Administrator required.'; end if;
    target_uid := (p_data->>'user_id')::bigint;
    if not exists(select 1 from public.users where user_id=target_uid and user_type in ('patient','doctor')) or length(coalesce(p_data->>'license_number','')) not between 1 and 50 or length(coalesce(p_data->>'name','')) not between 1 and 100 or coalesce((p_data->>'fee')::numeric,-1)<0 then raise exception 'Select an existing patient/doctor account and provide name, license and fee.'; end if;
    insert into public.doctors(user_id,first_name,last_name,license_number,phone,specialization,consultation_fee,available_days,available_hours)
    values(target_uid,p_data->>'name','',p_data->>'license_number',coalesce(left(p_data->>'phone',20),''),left(p_data->>'specialization',100),(p_data->>'fee')::numeric,'["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]','09:00-17:00')
    on conflict(user_id) do update set first_name=excluded.first_name,last_name='',license_number=excluded.license_number,phone=excluded.phone,specialization=excluded.specialization,consultation_fee=excluded.consultation_fee,status='active';
    update public.users set user_type='doctor',status='active',is_active=1 where user_id=target_uid;
    update public.profiles set role='doctor',display_name=p_data->>'name' where legacy_user_id=target_uid;
    return jsonb_build_object('ok',true);
  elsif p_action='close_contact' then
    if role_name<>'admin' then raise exception 'Administrator required.'; end if;
    update public.contact_submissions set status='closed' where contact_id=(p_data->>'contact_id')::bigint;
    return jsonb_build_object('ok',true);
  elsif p_action='chat' then
    n := left(trim(p_data->>'message'),1000);
    if n is null or length(n)=0 then raise exception 'Enter a message.'; end if;
    select response_text,knowledge_id into target_role,rid from public.chatbot_knowledge k where is_active=1 and rule_type='allowed'
      and exists(select 1 from regexp_split_to_table(k.keywords,',') keyword where length(trim(keyword))>2 and position(lower(trim(keyword)) in lower(n))>0)
      order by knowledge_id limit 1;
    target_role := coalesce(target_role,'I can help with clinic information. Please contact the clinic for personal medical advice; this assistant does not diagnose or prescribe.');
    insert into public.chatbot_logs(patient_id,session_id,user_message,bot_response,knowledge_id,is_restricted) values(pid,auth.uid()::text,n,target_role,rid,0);
    return jsonb_build_object('response',target_role);
  elsif p_action='catalog' then
    if role_name<>'admin' then raise exception 'Administrator required.'; end if;
    if coalesce(p_data->>'item_type','') not in ('medicine','lab_test','procedure') or length(coalesce(p_data->>'name','')) not between 1 and 255 or coalesce((p_data->>'price')::numeric,-1)<0 then raise exception 'Valid catalog type, name and price required.'; end if;
    insert into public.clinic_catalog(item_type,name,category,price,description) values(p_data->>'item_type',p_data->>'name',left(p_data->>'category',100),(p_data->>'price')::numeric,left(p_data->>'description',2000)) returning catalog_id into rid;
    return jsonb_build_object('id',rid);
  end if;
  raise exception 'Unsupported action.';
end $$;

-- Revoke the default PUBLIC execute grant for every new callable function.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('careplus_user_id','careplus_role','careplus_patient_id','careplus_doctor_id','careplus_can_treat','careplus_doctors','careplus_slots','careplus_action') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;
grant execute on function public.careplus_doctors() to anon;
grant execute on function public.careplus_action(text,jsonb) to anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('careplus-uploads','careplus-uploads',false,5242880,array['image/png','image/jpeg','image/webp','image/gif']) on conflict(id) do nothing;
create function public.careplus_can_read_upload(p_owner text) returns boolean language sql stable security definer set search_path = '' as $$
 select public.careplus_user_id() is not null and (p_owner=auth.uid()::text or public.careplus_role()='admin' or exists(
   select 1 from public.profiles p join public.patients patient on patient.user_id=p.legacy_user_id
   where p.id::text=p_owner and public.careplus_can_treat(patient.patient_id)))
$$;
revoke all on function public.careplus_can_read_upload(text) from public,anon,authenticated;
grant execute on function public.careplus_can_read_upload(text) to authenticated;
create policy careplus_upload_read on storage.objects for select to authenticated using (bucket_id='careplus-uploads' and public.careplus_can_read_upload((storage.foldername(name))[1]));
create policy careplus_upload_insert on storage.objects for insert to authenticated with check (bucket_id='careplus-uploads' and (storage.foldername(name))[1]=auth.uid()::text and public.careplus_user_id() is not null);
create policy careplus_upload_delete on storage.objects for delete to authenticated using (bucket_id='careplus-uploads' and (storage.foldername(name))[1]=auth.uid()::text and public.careplus_user_id() is not null);
commit;
