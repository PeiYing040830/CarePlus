begin;

-- Restore the original public doctor directory photographs only.
-- Patient/admin uploads remain private and the bucket stays private.
create function public.careplus_is_directory_photo(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.doctors d join public.users u on u.user_id=d.user_id
  where d.profile_picture=p_path and d.status='active'
    and u.status='active' and u.is_active=1
 );
$$;
revoke all on function public.careplus_is_directory_photo(text) from public;
grant execute on function public.careplus_is_directory_photo(text) to anon,authenticated;

create function public.careplus_doctor_photos()
returns table(doctor_id bigint,profile_picture text)
language sql stable security definer set search_path = '' as $$
 select d.doctor_id,d.profile_picture from public.doctors d
 join public.users u on u.user_id=d.user_id
 where d.status='active' and u.status='active' and u.is_active=1
 and d.profile_picture is not null
 and exists(select 1 from storage.objects o where o.bucket_id='careplus-uploads' and o.name=d.profile_picture);
$$;
revoke all on function public.careplus_doctor_photos() from public;
grant execute on function public.careplus_doctor_photos() to anon,authenticated;
grant select on storage.objects to anon;
create policy careplus_directory_photo_read on storage.objects for select to anon,authenticated
using(bucket_id='careplus-uploads' and public.careplus_is_directory_photo(name));

commit;
