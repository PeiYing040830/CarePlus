"""Verify legacy row counts and Auth hash retention without logging private data."""
from pathlib import Path
import argparse
import os
import tempfile
from import_legacy import cli, literal
from mysql_dump import load_dump

def main():
    parser=argparse.ArgumentParser();parser.add_argument('dump');args=parser.parse_args()
    tables=load_dump(args.dump);sql=[]
    for name,rows in tables.items():
        pk=next(iter(rows[0]));ids=','.join(str(row[pk]) for row in rows)
        sql.append(f"do $$ begin if (select count(*) from public.{name} where {pk} in ({ids})) <> {len(rows)} then raise exception 'Source ID mismatch: {name}'; end if; end $$;")
    for old in tables['users']:
        sql.append(f"do $$ begin if not exists(select 1 from public.profiles p join auth.users a on a.id=p.id where p.legacy_user_id={old['user_id']} and p.role={literal(old['user_type'])} and substring(a.encrypted_password from 5)=substring({literal(old['password_hash'])} from 5)) then raise exception 'Auth migration verification failed'; end if; end $$;")
    sql.append("select 'Source IDs, account roles and bcrypt hashes verified' as verification;")
    fd,name=tempfile.mkstemp(prefix='careplus-verify-',suffix='.sql')
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as out:out.write('\n'.join(sql))
        cli(['db','query','--linked','--file',name])
    finally:Path(name).unlink(missing_ok=True)
    print('Verified all source IDs across',len(tables),'tables and all',len(tables['users']),'account roles/password hashes.')

if __name__=='__main__':main()
