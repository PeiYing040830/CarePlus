begin;
create function public.careplus_admin_upload_owner(p_user_id bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if public.careplus_role() is distinct from 'admin' then raise exception 'Administrator required.'; end if;
 select id into result from public.profiles where legacy_user_id=p_user_id;
 if result is null then raise exception 'Account not found.'; end if;
 return result;
end; $$;
revoke all on function public.careplus_admin_upload_owner(bigint) from public,anon;
grant execute on function public.careplus_admin_upload_owner(bigint) to authenticated;
create policy careplus_admin_upload_insert on storage.objects for insert to authenticated with check
 (bucket_id='careplus-uploads' and (select public.careplus_role())='admin' and exists(select 1 from public.profiles where id::text=(storage.foldername(name))[1]));

create function public.careplus_admin_manage(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target bigint:=(p_data->>'user_id')::bigint; account public.users; owner_id uuid; pic text:=nullif(p_data->>'profile_picture','');
 birthday date; fee numeric; current_doctor public.doctors;
begin
 if public.careplus_role() is distinct from 'admin' then raise exception 'Administrator required.'; end if;
 if pg_column_size(p_data)>65536 then raise exception 'Request is too large.'; end if;
 if target is null and nullif(p_data->>'doctor_id','') is not null then select user_id into target from public.doctors where doctor_id=(p_data->>'doctor_id')::bigint; end if;
 select * into account from public.users where user_id=target for update;
 if not found then raise exception 'Account not found.'; end if;
 if p_action='doctor_status' then
  if account.user_type<>'doctor' or coalesce(p_data->>'status','') not in ('active','inactive','on_leave') then raise exception 'Invalid doctor status.'; end if;
  update public.doctors set status=p_data->>'status' where user_id=target;
 elsif p_action='deactivate' then
  if target=public.careplus_user_id() then raise exception 'You cannot deactivate your own account.'; end if;
  update public.users set status='inactive',is_active=0 where user_id=target;
  update public.doctors set status='inactive' where user_id=target;
 elsif p_action='edit' then
  if p_data ? 'email' and lower(trim(p_data->>'email')) is distinct from lower(account.email) then raise exception 'Change sign-in email through Supabase Auth, not the profile editor.'; end if;
  if p_data ? 'role' and p_data->>'role' is distinct from account.user_type then raise exception 'Role changes require account provisioning.'; end if;
  if length(trim(coalesce(p_data->>'first_name',''))) not between 1 and 100 or length(trim(coalesce(p_data->>'last_name',''))) not between 1 and 100 then raise exception 'First and last name are required (maximum 100 characters each).'; end if;
  if length(coalesce(p_data->>'phone',''))>20 then raise exception 'Phone number is too long.'; end if;
  select id into owner_id from public.profiles where legacy_user_id=target;
  if pic is not null and (split_part(pic,'/',1) is distinct from owner_id::text or not exists(select 1 from storage.objects where bucket_id='careplus-uploads' and name=pic)) then raise exception 'Invalid profile photo.'; end if;
  if account.user_type='patient' then
   birthday:=nullif(p_data->>'date_of_birth','')::date;
   if birthday>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Date of birth cannot be in the future.'; end if;
   update public.patients set first_name=trim(p_data->>'first_name'),last_name=trim(p_data->>'last_name'),phone=coalesce(p_data->>'phone',phone),
    ic_number=coalesce(p_data->>'ic_number',ic_number),date_of_birth=coalesce(birthday,date_of_birth),gender=coalesce(nullif(p_data->>'gender',''),gender),
    address=case when p_data ? 'address' then left(p_data->>'address',1000) else address end,
    emergency_contact=case when p_data ? 'emergency_contact' then left(p_data->>'emergency_contact',50) else emergency_contact end,
    allergies=case when p_data ? 'allergies' then left(p_data->>'allergies',2000) else allergies end,
    blood_type=case when p_data ? 'blood_type' then nullif(p_data->>'blood_type','') else blood_type end,profile_picture=coalesce(pic,profile_picture) where user_id=target;
  elsif account.user_type='doctor' then
   fee:=nullif(p_data->>'consultation_fee','')::numeric;if fee<0 or fee>100000 then raise exception 'Invalid consultation fee.'; end if;
   update public.doctors set first_name=trim(p_data->>'first_name'),last_name=trim(p_data->>'last_name'),phone=coalesce(p_data->>'phone',phone),
    ic_number=coalesce(p_data->>'ic_number',ic_number),specialization=coalesce(p_data->>'specialization',specialization),license_number=coalesce(nullif(p_data->>'license_number',''),license_number),consultation_fee=coalesce(fee,consultation_fee),profile_picture=coalesce(pic,profile_picture) where user_id=target;
  else
   update public.admins set first_name=trim(p_data->>'first_name'),last_name=trim(p_data->>'last_name'),phone=coalesce(p_data->>'phone',phone),profile_picture=coalesce(pic,profile_picture) where user_id=target;
  end if;
  update public.profiles set display_name=trim(p_data->>'first_name')||' '||trim(p_data->>'last_name') where legacy_user_id=target;
 else raise exception 'Unsupported management action.';
 end if;
 return jsonb_build_object('id',target);
end; $$;
revoke all on function public.careplus_admin_manage(text,jsonb) from public,anon;
grant execute on function public.careplus_admin_manage(text,jsonb) to authenticated;
commit;
