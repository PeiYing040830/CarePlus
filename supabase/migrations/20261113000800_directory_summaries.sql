begin;
create function public.careplus_doctor_ratings() returns table(doctor_id bigint,avg_rating numeric,review_count bigint)
language sql stable security definer set search_path='' as $$
 select d.doctor_id,coalesce(avg(r.rating),0),count(r.review_id) from public.doctors d
 join public.users u on u.user_id=d.user_id and u.status='active' and u.is_active=1
 left join public.reviews r on r.doctor_id=d.doctor_id
 where d.status='active' and public.careplus_user_id() is not null group by d.doctor_id
$$;
create function public.careplus_patient_contacts() returns table(patient_id bigint,email text)
language sql stable security definer set search_path='' as $$
 select p.patient_id,u.email::text from public.patients p join public.users u on u.user_id=p.user_id
 where public.careplus_role() in ('doctor','admin') and public.careplus_can_treat(p.patient_id)
$$;
revoke all on function public.careplus_doctor_ratings() from public,anon;
revoke all on function public.careplus_patient_contacts() from public,anon;
grant execute on function public.careplus_doctor_ratings(),public.careplus_patient_contacts() to authenticated;
commit;
