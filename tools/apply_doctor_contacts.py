"""Apply the doctor-directory contact fix with the existing management login."""
from pathlib import Path
from check_legacy_remote import management_query
from import_legacy import literal
version='20261113000200'
if not management_query("select version from supabase_migrations.schema_migrations where version='"+version+"'"):
 sql=Path('supabase/migrations/20261113000200_doctor_directory_contacts.sql').read_text(encoding='utf-8')
 record="insert into supabase_migrations.schema_migrations(version,name,statements) values ("+literal(version)+",'doctor_directory_contacts',array["+literal(sql)+"]);\n"
 management_query(sql.rsplit('commit;',1)[0]+record+'commit;',read_only=False)
 print('Doctor contact migration applied and recorded.')
else: print('Doctor contact migration already applied.')
print(management_query("""begin;
do $$ begin perform set_config('request.jwt.claim.sub', (select p.id::text from public.profiles p join public.users u on u.user_id=p.legacy_user_id where p.role='patient' and u.status='active' and u.is_active=1 limit 1), true); end $$;
set local role authenticated;
select count(*) as active_doctors,count(nullif(trim(phone),'')) as doctors_with_phone from public.careplus_doctor_contacts();
commit;""",read_only=False))
