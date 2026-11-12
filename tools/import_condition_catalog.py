"""Import the official CDC FY2027 ICD-10-CM vocabulary; no patient data is used."""
import argparse,hashlib,io,json,re,urllib.request,zipfile
from pathlib import Path
from check_legacy_remote import management_query
from import_legacy import literal
SOURCE='https://ftp.cdc.gov/pub/health_statistics/nchs/publications/ICD10CM/2027/icd10cm-code-descriptions-2027.zip'
VERSION='20261113000300'
EXPECTED_SHA256='93e3ad6004badf470c55bfe679b748ae88fd9b2b421851e409eec382c7713b9a'
def load_catalog():
 with urllib.request.urlopen(SOURCE,timeout=45) as response: blob=response.read()
 digest=hashlib.sha256(blob).hexdigest()
 if digest!=EXPECTED_SHA256: raise ValueError('CDC archive changed; review the new source before importing.')
 archive=zipfile.ZipFile(io.BytesIO(blob));name=next(n for n in archive.namelist() if n.endswith('/icd10cm-codes-2027.txt'))
 rows=[]
 for line in archive.read(name).decode('utf-8-sig').splitlines():
  match=re.fullmatch(r'([A-Z][A-Z0-9]{2,6})\s+(.+)',line.strip())
  if not match: raise ValueError('Unexpected CDC code description format.')
  rows.append({'code':match[1],'description':match[2]})
 if len({r['code'] for r in rows})!=len(rows) or len(rows)<70000: raise ValueError('Incomplete or duplicated reference catalog.')
 return rows,digest
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 rows,digest=load_catalog();print('Official CDC FY2027 code descriptions:',len(rows),'SHA256:',digest,flush=True)
 if not args.apply:return
 if not management_query("select version from supabase_migrations.schema_migrations where version="+literal(VERSION)):
  sql=Path('supabase/migrations/20261113000300_symptom_screening_catalog.sql').read_text(encoding='utf-8')
  record="insert into supabase_migrations.schema_migrations(version,name,statements) values ("+literal(VERSION)+",'symptom_screening_catalog',array["+literal(sql)+"]);\n"
  management_query(sql.rsplit('commit;',1)[0]+record+'commit;',read_only=False)
  print('Screening/catalog migration applied.',flush=True)
 for offset in range(0,len(rows),2000):
  batch=rows[offset:offset+2000]
  sql="insert into public.condition_catalog(code,coding_system,release,description,source_url,source_sha256) select x.code,'ICD-10-CM','FY2027',x.description,"+literal(SOURCE)+','+literal(digest)+" from jsonb_to_recordset("+literal(json.dumps(batch))+"::jsonb) as x(code text,description text) on conflict(coding_system,release,code) do update set description=excluded.description,source_url=excluded.source_url,source_sha256=excluded.source_sha256;"
  management_query(sql,read_only=False)
  print('Imported',min(offset+2000,len(rows)),'/',len(rows),flush=True)
 result=management_query("select count(*) as count from public.condition_catalog where coding_system='ICD-10-CM' and release='FY2027' and source_sha256="+literal(digest))
 if result[0]['count']!=len(rows):raise RuntimeError('Remote catalog count mismatch.')
 print('Verified remote catalog count:',len(rows),flush=True)
if __name__=='__main__':main()
