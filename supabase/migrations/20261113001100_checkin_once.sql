begin;
alter function public.careplus_action(text,jsonb) rename to careplus_action_pre_checkin;
revoke all on function public.careplus_action_pre_checkin(text,jsonb) from public,anon,authenticated;
create function public.careplus_action(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare appointment public.appointments; role_name text:=public.careplus_role();
begin
 if p_action in ('checkin','checkin_qr') and role_name in ('doctor','admin') then
  select * into appointment from public.appointments a
  where ((p_action='checkin' and a.appointment_id=(p_data->>'appointment_id')::bigint) or (p_action='checkin_qr' and a.qr_code=p_data->>'qr_code'))
   and (role_name='admin' or a.doctor_id=public.careplus_doctor_id()) for update;
  if found and appointment.checked_in_at is not null then raise exception 'This appointment is already checked in.'; end if;
 end if;
 return public.careplus_action_pre_checkin(p_action,p_data);
end; $$;
revoke all on function public.careplus_action(text,jsonb) from public;
grant execute on function public.careplus_action(text,jsonb) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
