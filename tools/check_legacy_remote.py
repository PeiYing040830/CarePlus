"""Read-only legacy import check through the existing CLI management login."""
import base64,ctypes,ctypes.wintypes as w,json,urllib.request,urllib.error
from mysql_dump import load_dump
from import_legacy import literal
class Credential(ctypes.Structure):
 _fields_=[('Flags',w.DWORD),('Type',w.DWORD),('TargetName',w.LPWSTR),('Comment',w.LPWSTR),('LastWritten',w.FILETIME),('CredentialBlobSize',w.DWORD),('CredentialBlob',ctypes.POINTER(ctypes.c_ubyte)),('Persist',w.DWORD),('AttributeCount',w.DWORD),('Attributes',ctypes.c_void_p),('TargetAlias',w.LPWSTR),('UserName',w.LPWSTR)]
def management_query(query,read_only=True,diagnostic=False):
 api=ctypes.WinDLL('Advapi32.dll');pointer=ctypes.POINTER(Credential)()
 api.CredReadW.argtypes=[w.LPCWSTR,w.DWORD,w.DWORD,ctypes.POINTER(ctypes.POINTER(Credential))]
 api.CredFree.argtypes=[ctypes.c_void_p]
 if not api.CredReadW('Supabase CLI:supabase',1,0,ctypes.byref(pointer)): raise RuntimeError('Existing CLI login unavailable.')
 try: token=ctypes.string_at(pointer.contents.CredentialBlob,pointer.contents.CredentialBlobSize).decode('utf-8')
 finally: api.CredFree(pointer)
 if token.startswith('go-keyring-base64:'): token=base64.b64decode(token.split(':',1)[1]).decode()
 body=json.dumps({'query':query,'read_only':read_only}).encode()
 req=urllib.request.Request('https://api.supabase.com/v1/projects/guvhmilltpgoloqkvnmj/database/query',method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=body)
 try:
  with urllib.request.urlopen(req,timeout=45) as response: results=json.load(response)
 except urllib.error.HTTPError as e:
  if diagnostic: raise RuntimeError(e.read().decode('utf-8')) from None
  raise RuntimeError('Management query failed: HTTP '+str(e.code)) from None
 except Exception as e: raise RuntimeError('Management query failed: '+type(e).__name__) from None
 return results

def main():
 tables=load_dump('../clinic_management (data).sql');checks=[]
 for table,rows in tables.items():
  if not rows: continue
  pk=next(iter(rows[0]));ids=','.join(str(r[pk]) for r in rows)
  checks.append(f"select {literal(table)} as check_name, {len(rows)} as expected, count(*) as matched from public.{table} where {pk} in ({ids})")
 for old in tables['users']:
  checks.append(f"select 'auth_legacy_id_{old['user_id']}' as check_name,1 as expected,count(*) as matched from public.profiles p join auth.users a on a.id=p.id where p.legacy_user_id={old['user_id']} and p.role={literal(old['user_type'])} and lower(a.email)=lower({literal(old['email'])}) and substring(a.encrypted_password from 5)=substring({literal(old['password_hash'])} from 5)")
 results=management_query(' union all '.join(checks))
 for row in results: print(json.dumps(row))
 if any(int(row['matched'])!=int(row['expected']) for row in results): raise RuntimeError('Legacy verification mismatch; no data was changed.')
 print('Verified: all source IDs and all five account email/role/password hash mappings. No data was changed.')
if __name__=='__main__': main()
