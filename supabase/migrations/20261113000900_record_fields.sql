begin;
create function public.careplus_save_record(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.medical_records; a public.appointments; rid bigint; did bigint:=public.careplus_doctor_id();
begin
 if public.careplus_role() is distinct from 'doctor' or did is null then raise exception 'Doctor account required.'; end if;
 if pg_column_size(p_data)>65536 then raise exception 'Request is too large.'; end if;
 if length(trim(coalesce(p_data->>'diagnosis',''))) not between 1 and 500 then raise exception 'Enter diagnosis (maximum 500 characters).'; end if;
 if nullif(p_data->>'record_id','') is not null then
  select * into r from public.medical_records where record_id=(p_data->>'record_id')::bigint for update;
  if not found or r.doctor_id is distinct from did then raise exception 'Only the assigned doctor can edit this record.'; end if;
  if nullif(p_data->>'patient_id','') is not null and r.patient_id is distinct from (p_data->>'patient_id')::bigint then raise exception 'The patient cannot be changed.'; end if;
  if nullif(p_data->>'visit_date','') is not null and r.visit_date is distinct from (p_data->>'visit_date')::date then raise exception 'The visit date belongs to the appointment and cannot be changed here.'; end if;
  update public.medical_records set diagnosis=p_data->>'diagnosis',symptoms=left(p_data->>'symptoms',4000),prescription=left(p_data->>'prescription',4000),lab_results=left(p_data->>'lab_results',4000),notes=left(p_data->>'notes',4000),updated_at=now() where record_id=r.record_id;
  rid:=r.record_id;
 else
  select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
  if not found or a.doctor_id is distinct from did or a.status not in ('confirmed','completed') then raise exception 'Only the assigned doctor can enter clinical information.'; end if;
  if nullif(p_data->>'patient_id','') is not null and a.patient_id is distinct from (p_data->>'patient_id')::bigint then raise exception 'The patient does not match the appointment.'; end if;
  if nullif(p_data->>'visit_date','') is not null and a.appointment_date is distinct from (p_data->>'visit_date')::date then raise exception 'The visit date must match the appointment.'; end if;
  insert into public.medical_records(patient_id,doctor_id,appointment_id,visit_date,diagnosis,symptoms,prescription,lab_results,notes)
  values(a.patient_id,did,a.appointment_id,a.appointment_date,p_data->>'diagnosis',left(p_data->>'symptoms',4000),left(p_data->>'prescription',4000),left(p_data->>'lab_results',4000),left(p_data->>'notes',4000)) returning record_id into rid;
 end if;
 return jsonb_build_object('id',rid);
end; $$;
revoke all on function public.careplus_save_record(jsonb) from public,anon;
grant execute on function public.careplus_save_record(jsonb) to authenticated;
commit;
