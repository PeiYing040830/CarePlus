"""Apply the directory-photo migration using the existing management login."""
from pathlib import Path
from check_legacy_remote import management_query
from import_legacy import literal
version='20261113000100'
if management_query("select version from supabase_migrations.schema_migrations where version='"+version+"'"):
 print('Directory photo migration already applied.')
else:
 sql=Path('supabase/migrations/20261113000100_doctor_directory_photos.sql').read_text(encoding='utf-8')
 record="insert into supabase_migrations.schema_migrations(version,name,statements) values ("+literal(version)+",'doctor_directory_photos',array["+literal(sql)+"]);\n"
 sql=sql.rsplit('commit;',1)[0]+record+'commit;'
 management_query(sql,read_only=False)
 print('Directory photo migration applied and recorded.')
checks=management_query('''select (select count(*) from public.careplus_doctor_photos()) as directory_photos,(select "public" from storage.buckets where id='careplus-uploads') as bucket_public''',read_only=False,diagnostic=True)
print(checks)
