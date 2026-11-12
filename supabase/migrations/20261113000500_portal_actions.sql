begin;
-- Registration metadata supplies demographics only, never account privileges.
create or replace function public.careplus_create_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid bigint; m jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb);
 first_name text; last_name text; birthday date;
begin
 first_name:=left(coalesce(nullif(trim(m->>'first_name'),''),m->>'display_name',''),100);
 last_name:=left(coalesce(m->>'last_name',''),100);
 if nullif(m->>'date_of_birth','') is not null then
  birthday:=(m->>'date_of_birth')::date;
  if birthday>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Date of birth cannot be in the future.'; end if;
 end if;
 insert into public.users(email,user_type) values(new.email,'patient') returning user_id into uid;
 insert into public.patients(user_id,first_name,last_name,phone,ic_number,date_of_birth,gender,address,emergency_contact,blood_type,allergies)
 values(uid,first_name,last_name,left(coalesce(m->>'phone',''),20),left(coalesce(m->>'ic_number',''),20),birthday,
 case when m->>'gender' in ('male','female') then m->>'gender' else null end,left(m->>'address',1000),left(m->>'emergency_contact',50),left(m->>'blood_type',5),left(m->>'allergies',2000));
 insert into public.profiles(id,display_name,role,legacy_user_id)
 values(new.id,trim(first_name||' '||last_name),'patient',uid);
 return new;
end; $$;
-- Keep the existing checked workflows, extending only the missing operations.
alter function public.careplus_action(text,jsonb) rename to careplus_action_base;
revoke all on function public.careplus_action_base(text,jsonb) from public,anon,authenticated;

create table public.prescription_logs (
 log_id bigint generated always as identity primary key,
 prescription_id bigint not null references public.prescriptions(prescription_id),
 user_id bigint not null references public.users(user_id),
 action text not null check(action in ('create','update','cancel','view','print')),
 description text not null,
 ip_address text not null default '',
 created_at timestamptz not null default now()
);
alter table public.prescription_logs enable row level security;
grant select on public.prescription_logs to authenticated;
create policy prescription_logs_owner on public.prescription_logs for select to authenticated
 using(user_id=(select public.careplus_user_id()) or (select public.careplus_role())='admin');

create function public.careplus_prescription_audit() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid bigint:=public.careplus_user_id(); event text;
begin
 if uid is null then return new; end if;
 event:=case when tg_op='INSERT' then 'create' when new.status='cancelled' and old.status is distinct from new.status then 'cancel' else 'update' end;
 insert into public.prescription_logs(prescription_id,user_id,action,description)
 values(new.prescription_id,uid,event,'Prescription #'||new.prescription_id||': '||event);
 return new;
end; $$;
create trigger prescription_audit after insert or update on public.prescriptions
 for each row execute function public.careplus_prescription_audit();

create function public.careplus_action(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid bigint:=public.careplus_user_id(); role_name text:=public.careplus_role();
 did bigint:=public.careplus_doctor_id(); r public.prescriptions; rec public.medical_records;
 aid bigint; days jsonb; start_time time; end_time time; fee numeric; experience int; n text;
begin
 if pg_column_size(p_data)>65536 then raise exception 'Request is too large.'; end if;
 if p_action not in ('profile','delete_notification','checkin_qr','update_record','update_prescription','cancel_prescription','prescription_log') then
  return public.careplus_action_base(p_action,p_data);
 end if;
 if uid is null then raise exception 'Sign in with an active account first.'; end if;
 if p_action='profile' then
  if p_data ? 'phone' and length(coalesce(p_data->>'phone',''))>20 then raise exception 'Phone number is too long.'; end if;
  -- Identity fields are read-only in the original profile forms. Preserve names.
  if role_name='patient' then
   if p_data ? 'blood_type' and coalesce(p_data->>'blood_type','') not in ('','A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') then raise exception 'Invalid blood type.'; end if;
   update public.patients set phone=case when p_data ? 'phone' then p_data->>'phone' else phone end,
    address=case when p_data ? 'address' then left(p_data->>'address',1000) else address end,
    emergency_contact=case when p_data ? 'emergency_contact' then left(p_data->>'emergency_contact',50) else emergency_contact end,
    allergies=case when p_data ? 'allergies' then left(p_data->>'allergies',2000) else allergies end,
    blood_type=case when p_data ? 'blood_type' then nullif(p_data->>'blood_type','') else blood_type end
   where user_id=uid;
  elsif role_name='admin' then
   update public.admins set phone=case when p_data ? 'phone' then p_data->>'phone' else phone end,
    department=case when p_data ? 'department' then left(p_data->>'department',100) else department end where user_id=uid;
  elsif role_name='doctor' then
   if p_data ? 'available_days' then
    days:=p_data->'available_days';
    if jsonb_typeof(days) is distinct from 'array' then raise exception 'Select available days.'; end if;
    if exists(select 1 from jsonb_array_elements_text(days) day where day not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')) then raise exception 'Invalid available day.'; end if;
   else select available_days into days from public.doctors where user_id=uid; end if;
   if p_data ? 'available_start' or p_data ? 'available_end' then
    start_time:=(p_data->>'available_start')::time;end_time:=(p_data->>'available_end')::time;
    if start_time is null or end_time is null or start_time>=end_time then raise exception 'End time must be after start time.'; end if;
   end if;
   fee:=nullif(p_data->>'consultation_fee','')::numeric;experience:=nullif(p_data->>'experience_years','')::int;
   if fee<0 or fee>100000 or experience<0 or experience>80 then raise exception 'Invalid fee or years of experience.'; end if;
   if p_data ? 'license_number' and length(trim(coalesce(p_data->>'license_number','')))=0 then raise exception 'License number is required.'; end if;
   update public.doctors set phone=case when p_data ? 'phone' then p_data->>'phone' else phone end,
    specialization=case when p_data ? 'specialization' then left(p_data->>'specialization',100) else specialization end,
    qualifications=case when p_data ? 'qualifications' then left(p_data->>'qualifications',2000) else qualifications end,
    license_number=case when p_data ? 'license_number' then left(p_data->>'license_number',50) else license_number end,
    bio=case when p_data ? 'bio' then left(p_data->>'bio',4000) else bio end,
    consultation_fee=coalesce(fee,consultation_fee),experience_years=coalesce(experience,experience_years),available_days=days,
    available_hours=case when start_time is not null then to_char(start_time,'HH24:MI')||'-'||to_char(end_time,'HH24:MI') else available_hours end
   where user_id=uid;
  end if;
  return jsonb_build_object('ok',true);
 elsif p_action='delete_notification' then
  delete from public.notifications where notification_id=(p_data->>'notification_id')::bigint and user_id=uid;
  if not found then raise exception 'Notification not found.'; end if;
  return jsonb_build_object('ok',true);
 elsif p_action='checkin_qr' then
  if role_name not in ('admin','doctor') then raise exception 'Staff access required.'; end if;
  select appointment_id into aid from public.appointments where qr_code=p_data->>'qr_code'
   and (role_name='admin' or doctor_id=did);
  if aid is null then raise exception 'Appointment QR code not found.'; end if;
  return public.careplus_action_base('checkin',jsonb_build_object('appointment_id',aid));
 elsif p_action='update_record' then
  select * into rec from public.medical_records where record_id=(p_data->>'record_id')::bigint for update;
  if not found or role_name<>'doctor' or rec.doctor_id is distinct from did then raise exception 'Only the assigned doctor can edit this record.'; end if;
  if nullif(p_data->>'patient_id','') is not null and rec.patient_id is distinct from (p_data->>'patient_id')::bigint then raise exception 'The patient cannot be changed.'; end if;
  if length(trim(coalesce(p_data->>'diagnosis',''))) not between 1 and 500 then raise exception 'Enter diagnosis (maximum 500 characters).'; end if;
  update public.medical_records set diagnosis=p_data->>'diagnosis',symptoms=left(p_data->>'symptoms',4000),prescription=left(p_data->>'prescription',4000),lab_results=left(p_data->>'lab_results',4000),notes=left(p_data->>'notes',4000),updated_at=now() where record_id=rec.record_id;
  return jsonb_build_object('id',rec.record_id);
 else
  select * into r from public.prescriptions where prescription_id=(p_data->>'prescription_id')::bigint for update;
  if not found or role_name<>'doctor' or r.doctor_id is distinct from did then raise exception 'Only the prescribing doctor can access this operation.'; end if;
  if p_action='prescription_log' then
   n:=p_data->>'log_action';if n not in ('view','print') or n is null then raise exception 'Invalid log action.'; end if;
   insert into public.prescription_logs(prescription_id,user_id,action,description) values(r.prescription_id,uid,n,'Prescription #'||r.prescription_id||': '||n);
  else
   if r.status<>'active' then raise exception 'Only active prescriptions can be changed.'; end if;
   if p_action='cancel_prescription' then
    update public.prescriptions set status='cancelled',updated_at=now() where prescription_id=r.prescription_id;
   else
    if nullif(p_data->>'patient_id','') is not null and r.patient_id is distinct from (p_data->>'patient_id')::bigint then raise exception 'The patient cannot be changed.'; end if;
    if length(trim(coalesce(p_data->>'diagnosis',''))) not between 1 and 500 then raise exception 'Enter diagnosis (maximum 500 characters).'; end if;
    if jsonb_typeof(p_data->'medications') is distinct from 'array' then raise exception 'Enter medications as an array.'; end if;
    if jsonb_array_length(p_data->'medications') not between 1 and 30 then raise exception 'Enter 1–30 medications.'; end if;
    update public.prescriptions set diagnosis=p_data->>'diagnosis',notes=left(p_data->>'notes',4000),medications_json=p_data->'medications',updated_at=now() where prescription_id=r.prescription_id;
   end if;
  end if;
  return jsonb_build_object('id',r.prescription_id);
 end if;
end; $$;
revoke all on function public.careplus_action(text,jsonb) from public;
grant execute on function public.careplus_action(text,jsonb) to anon,authenticated;
commit;
