-- Run once in the Supabase SQL Editor. No real clinical data is included.
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'patient' check (role in ('patient','doctor','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
-- Anonymous queries return no rows. Users can only read their own profile.
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
-- No browser role changes, inserts, or deletes are permitted.
create or replace function public.careplus_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'patient');
  return new;
end;
$$;
revoke all on function public.careplus_create_profile() from public, anon, authenticated;
drop trigger if exists careplus_auth_user_created on auth.users;
create trigger careplus_auth_user_created after insert on auth.users
  for each row execute function public.careplus_create_profile();
-- Backfill accounts created before installing this schema.
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '') from auth.users
on conflict (id) do nothing;
commit;
