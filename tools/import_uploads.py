"""Import referenced profile images to private Supabase Storage (never Git)."""
import argparse
import json
import mimetypes
import os
from pathlib import Path
import tempfile
import urllib.parse
import urllib.request
from import_legacy import cli, literal, PROJECT, URL
from mysql_dump import load_dump

def main():
    parser=argparse.ArgumentParser();parser.add_argument('dump');parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    source=Path(args.dump).resolve();root=source.parent;tables=load_dump(source)
    refs=[(table,row) for table in ('patients','doctors','admins') for row in tables[table] if row.get('profile_picture')]
    print('Referenced profile images:',len(refs))
    if not args.apply:return
    service=next(k['api_key'] for k in cli(['projects','api-keys','--project-ref',PROJECT])['keys'] if k.get('name')=='service_role')
    headers={'apikey':service,'Authorization':'Bearer '+service}
    request=urllib.request.Request(URL+'/auth/v1/admin/users?per_page=100',headers=headers)
    with urllib.request.urlopen(request,timeout=30) as r: users=json.load(r)['users']
    mapping={u.get('app_metadata',{}).get('careplus_legacy_id'):u['id'] for u in users}
    statements=['begin;'];uploaded=missing=unsupported=0
    for table,row in refs:
        raw=row['profile_picture'].replace('\\','/')
        candidates=[root/raw.lstrip('/'),root/table/raw,root/'uploads'/Path(raw).name]
        path=next((p.resolve() for p in candidates if p.resolve().is_relative_to(root) and p.is_file()),None)
        if path is None:missing+=1;continue
        mime=mimetypes.guess_type(path.name)[0]
        if mime not in ('image/jpeg','image/png','image/webp','image/gif') or path.stat().st_size>5242880:unsupported+=1;continue
        owner=mapping.get(row['user_id'])
        if not owner:raise RuntimeError('Upload owner has not been migrated.')
        object_name=owner+'/legacy-'+table+'-'+str(next(iter(row.values())))+path.suffix.lower()
        target=URL+'/storage/v1/object/careplus-uploads/'+urllib.parse.quote(object_name,safe='/')
        request=urllib.request.Request(target,data=path.read_bytes(),method='POST',headers={**headers,'Content-Type':mime,'x-upsert':'true'})
        with urllib.request.urlopen(request,timeout=30) as r:r.read()
        pk=next(iter(row));statements.append(f'update public.{table} set profile_picture={literal(object_name)} where {pk}={int(row[pk])};')
        uploaded+=1
    statements.append('commit;')
    fd,name=tempfile.mkstemp(prefix='careplus-images-',suffix='.sql')
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as out:out.write('\n'.join(statements))
        cli(['db','query','--linked','--file',name])
    finally:Path(name).unlink(missing_ok=True)
    print(f'Private images uploaded: {uploaded}; missing source files: {missing}; unsupported: {unsupported}.')

if __name__=='__main__':main()
