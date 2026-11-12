begin;

-- Restore doctor contact numbers for active signed-in clinic accounts.
create function public.careplus_doctor_contacts()
returns table(doctor_id bigint,phone text)
language sql stable security definer set search_path = '' as $$
 select d.doctor_id,d.phone::text from public.doctors d
 join public.users u on u.user_id=d.user_id
 where d.status='active' and u.status='active' and u.is_active=1
 and public.careplus_role() is not null;
$$;
revoke all on function public.careplus_doctor_contacts() from public;
grant execute on function public.careplus_doctor_contacts() to authenticated;

commit;
