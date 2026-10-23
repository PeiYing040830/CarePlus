"""Explicit one-time import. Source SQL and generated data stay outside Git.

Run from the linked repository: python tools/import_legacy.py ../"clinic_management (data).sql" --apply
Requires an authorized Supabase CLI account. Secrets are kept only in memory.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import urllib.error
from mysql_dump import load_dump

PROJECT = 'guvhmilltpgoloqkvnmj'
URL = f'https://{PROJECT}.supabase.co'

def cli(args):
    result = subprocess.run(['supabase.cmd', *args, '--agent','no','--output-format','json'],capture_output=True,text=True,encoding='utf-8')
    if result.returncode: raise RuntimeError('Supabase CLI operation failed; sensitive output suppressed: '+args[0])
    if args[:2]==['db','query']: return result.stdout
    return json.loads(result.stdout) if result.stdout.strip() else None

def literal(value):
    if value is None: return 'null'
    if isinstance(value,int): return str(value)
    if '\0' in str(value): raise ValueError('PostgreSQL cannot store NUL characters')
    return "'"+str(value).replace("'","''")+"'"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('dump'); parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    tables=load_dump(args.dump)
    print('Source row counts:',json.dumps({k:len(v) for k,v in tables.items()}))
    if not args.apply: return
    keys=cli(['projects','api-keys','--project-ref',PROJECT])['keys']
    service=next(k['api_key'] for k in keys if k.get('name')=='service_role')
    def api(method,path,body=None):
        request=urllib.request.Request(URL+'/auth/v1'+path,method=method,headers={'apikey':service,'Authorization':'Bearer '+service,'Content-Type':'application/json'},data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(request,timeout=30) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f'Auth import request failed (HTTP {e.code}); no account details logged.') from None
    existing={}
    page=1
    while True:
        batch=api('GET',f'/admin/users?page={page}&per_page=100')['users']
        existing.update({u['email'].lower():u for u in batch})
        if len(batch)<100: break
        page+=1
    stage=cli(['db','query','--linked',"select case when to_regprocedure('public.careplus_action(text,jsonb)') is null then 'legacy_stage_ready' else 'live_workflows_installed' end as stage"])
    if 'live_workflows_installed' in stage and any(old['email'].lower() not in existing for old in tables['users']):
        raise RuntimeError('First-time legacy imports must run after migration 002 and before migration 003; live signup already allocates business IDs. No accounts were changed.')
    mapping={}
    for old in tables['users']:
        email=old['email'].lower()
        user=existing.get(email)
        if user:
            if user.get('app_metadata',{}).get('careplus_legacy_id')!=old['user_id']:
                raise RuntimeError('An existing email collides with a legacy account; stopped without overwriting it.')
        else:
            if not old['password_hash'].startswith(('$2y$','$2b$','$2a$')): raise RuntimeError('Unsupported legacy password hash')
            user=api('POST','/admin/users',{'email':old['email'],'password_hash':old['password_hash'],'email_confirm':True,
                'app_metadata':{'careplus_legacy_id':old['user_id']},'user_metadata':{'display_name':'CarePlus user'}})
            if 'user' in user: user=user['user']
        mapping[old['user_id']]=user['id']
        if old.get('status') in ('suspended','inactive') or old.get('is_active')==0:
            api('PUT','/admin/users/'+user['id'],{'ban_duration':'876000h'})
    # Preserve SQL datetimes in their original Asia/Kuala_Lumpur timezone.
    sql=['begin;',"set local timezone = 'Asia/Kuala_Lumpur';"]
    for table,rows in tables.items():
        if table.startswith(('vw_','v_')): continue
        for row in rows:
            row={k:v for k,v in row.items() if k not in ('password_hash','security_question','security_answer')}
            cols=list(row)
            sql.append('insert into public.'+table+' ('+','.join('"'+c+'"' for c in cols)+') values ('+','.join(literal(row[c]) for c in cols)+') on conflict do nothing;')
        pk=next(iter(rows[0])) if rows else None
        if pk: sql.append(f"select setval(pg_get_serial_sequence('public.{table}','{pk}'), greatest(coalesce((select max({pk}) from public.{table}),0),1), true);")
    for old in tables['users']:
        details=next((r for t in ('patients','doctors','admins') for r in tables.get(t,[]) if r.get('user_id')==old['user_id']),{})
        name=(details.get('first_name','')+' '+details.get('last_name','')).strip() or 'CarePlus user'
        sql.append(f"update public.profiles set legacy_user_id={old['user_id']}, role={literal(old['user_type'])}, display_name={literal(name)} where id={literal(mapping[old['user_id']])}::uuid;")
    counts={t:len(rows) for t,rows in tables.items() if not t.startswith(('vw_','v_'))}
    for table,count in counts.items():
        sql.append(f"do $$ begin if (select count(*) from public.{table}) < {count} then raise exception 'Import count check failed: {table}'; end if; end $$;")
    sql.append('commit;')
    # Temporary SQL contains private data and is deleted even if import fails.
    fd,path=tempfile.mkstemp(prefix='careplus-import-',suffix='.sql')
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as out: out.write('\n'.join(sql))
        cli(['db','query','--linked','--file',path])
    finally: Path(path).unlink(missing_ok=True)
    print('Imported accounts:',len(mapping),'; business tables:',len(counts),'; no credentials printed or saved.')

if __name__=='__main__': main()
