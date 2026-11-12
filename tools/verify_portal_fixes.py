"""Read-only live checks. Prints aggregate counts only, never account details."""
from check_legacy_remote import management_query

print(management_query("""
select count(*) as recorded_portal_migrations
from supabase_migrations.schema_migrations
where version between '20261113000400' and '20261113000900'
"""))
print(management_query("""
select count(*) as installed_portal_functions from pg_proc p
join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
and p.proname in ('careplus_action','careplus_save_review','careplus_admin_manage',
'careplus_admin_upload_owner','careplus_save_payment','careplus_doctor_ratings',
'careplus_patient_contacts','careplus_save_record')
"""))
print(management_query("""begin;
do $$ begin
 perform set_config('request.jwt.claim.sub',(select p.id::text from public.profiles p
 join public.users u on u.user_id=p.legacy_user_id where p.role='doctor'
 and u.status='active' and u.is_active=1 limit 1),true);
end $$;
set local role authenticated;
select (select count(*) from public.careplus_doctor_ratings()) as rating_summaries,
(select count(*) from public.careplus_patient_contacts()) as authorized_patient_contacts,
(select count(*) from public.prescription_logs) as visible_prescription_logs;
rollback;""", read_only=False))
print('Live verification used SELECTs and transaction-local role settings only.')
