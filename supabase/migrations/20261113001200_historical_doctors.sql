begin;
-- Access follows an existing clinical relationship; this does not reopen booking.
create function public.careplus_can_view_doctor_history(p_doctor bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select public.careplus_role()='admin' or p_doctor=public.careplus_doctor_id() or
 (public.careplus_role()='patient' and (
  exists(select 1 from public.appointments where doctor_id=p_doctor and patient_id=public.careplus_patient_id()) or
  exists(select 1 from public.medical_records where doctor_id=p_doctor and patient_id=public.careplus_patient_id()) or
  exists(select 1 from public.prescriptions where doctor_id=p_doctor and patient_id=public.careplus_patient_id())
 ))
$$;
revoke all on function public.careplus_can_view_doctor_history(bigint) from public,anon;
grant execute on function public.careplus_can_view_doctor_history(bigint) to authenticated;
create function public.careplus_historical_doctors()
returns table(doctor_id bigint,first_name text,last_name text,specialization text,phone text,profile_picture text,consultation_fee numeric,status text)
language sql stable security definer set search_path='' as $$
 select d.doctor_id,d.first_name::text,d.last_name::text,d.specialization::text,d.phone::text,d.profile_picture::text,d.consultation_fee,d.status
 from public.doctors d where public.careplus_user_id() is not null and public.careplus_can_view_doctor_history(d.doctor_id)
$$;
revoke all on function public.careplus_historical_doctors() from public,anon;
grant execute on function public.careplus_historical_doctors() to authenticated;
create function public.careplus_can_read_historical_doctor_photo(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.careplus_user_id() is not null and exists(select 1 from public.doctors d where d.profile_picture=p_path and public.careplus_can_view_doctor_history(d.doctor_id))
$$;
revoke all on function public.careplus_can_read_historical_doctor_photo(text) from public,anon;
grant execute on function public.careplus_can_read_historical_doctor_photo(text) to authenticated;
create policy careplus_historical_doctor_photo on storage.objects for select to authenticated
 using(bucket_id='careplus-uploads' and public.careplus_can_read_historical_doctor_photo(name));
notify pgrst, 'reload schema';
commit;
