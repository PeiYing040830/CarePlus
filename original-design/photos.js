/* Resolve the original directory portraits without exposing unrelated uploads. */
window.CarePlusProfilePhotos=async(client,tables)=>{
 const requests=new Map();
 await Promise.all(['patients','doctors','admins'].flatMap(table=>(tables[table]||[]).map(async row=>{
  const path=row.profile_picture;
  if(!path||/^https?:|^blob:/.test(path))return;
  if(!requests.has(path))requests.set(path,client.storage.from('careplus-uploads').createSignedUrl(path,3600));
  const result=await requests.get(path);
  if(result.error){row.profile_picture=null;console.error('Profile image unavailable for '+table);}
  else row.profile_picture=result.data.signedUrl;
 })));
};
window.CarePlusDoctorPhotos=async(client,directory,tables)=>{
 const result=await client.rpc('careplus_doctor_photos');
 if(result.error){console.error('Doctor photographs unavailable:',result.error.message);return;}
 for(const doctor of directory)doctor.profile_picture=null;
 const activeIds=new Set(directory.map(d=>String(d.doctor_id)));
 for(const doctor of tables.doctors||[])if(activeIds.has(String(doctor.doctor_id)))doctor.profile_picture=null;
 await Promise.all((result.data||[]).map(async photo=>{
  const signed=await client.storage.from('careplus-uploads').createSignedUrl(photo.profile_picture,3600);
  if(signed.error){console.error('Doctor photograph unavailable:',photo.doctor_id);return;}
  for(const row of [...directory,...(tables.doctors||[])])if(String(row.doctor_id)===String(photo.doctor_id))row.profile_picture=signed.data.signedUrl;
 }));
};
