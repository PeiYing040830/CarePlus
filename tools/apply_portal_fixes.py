"""Apply tested, additive portal fixes using the existing management login.

Does not replay legacy imports or modify existing clinical/payment records.
"""
from pathlib import Path
from check_legacy_remote import management_query
from import_legacy import literal

def main():
    for version, name in [
        ('20261113000400', 'payment_reviews'),
        ('20261113000500', 'portal_actions'),
        ('20261113000600', 'admin_management'),
        ('20261113000700', 'billing_workflows'),
        ('20261113000800', 'directory_summaries'),
        ('20261113000900', 'record_fields'),
        ('20261113001000', 'guest_chat'),
    ]:
        found = management_query('select version from supabase_migrations.schema_migrations where version=' + literal(version))
        if found:
            print(version + ': already applied')
            continue
        sql = Path('supabase/migrations/' + version + '_' + name + '.sql').read_text(encoding='utf-8')
        record = 'insert into supabase_migrations.schema_migrations(version,name,statements) values (' + literal(version) + ',' + literal(name) + ',array[' + literal(sql) + ']);\n'
        management_query(sql.rsplit('commit;', 1)[0] + record + 'commit;', read_only=False)
        print(version + ': applied and recorded')
    management_query("notify pgrst, 'reload schema';", read_only=False)
    print('Supabase REST schema refresh requested.')
    print('Portal functions deployed. Existing clinical/payment rows were not rewritten.')

if __name__ == '__main__':
    main()
