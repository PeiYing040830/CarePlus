/* Keep prescription cards aligned with the doctor's current directory photo. */
document.addEventListener('DOMContentLoaded',()=>{
 const state=window.CarePlusOriginalData;if(state?.page!=='patient/prescription.html')return;
 let refreshing=false;
 function render(){
  const prescriptions=window.CarePlusOriginalContext(state,state.page).prescriptions;
  for(const card of document.querySelectorAll('.prescription-card[data-prescription-id]')){
   const row=prescriptions.find(r=>String(r.prescription_id)===card.dataset.prescriptionId);
   const avatar=card.querySelector('.doctor-avatar');if(!row||!avatar)continue;
   const placeholder=document.createElement('span');placeholder.textContent=row.doctor_gender==='female'?'👩‍⚕️':'👨‍⚕️';
   const url=row.doctor_profile_picture;
   if(!url||!/^https:\/\//.test(url)){avatar.replaceChildren(placeholder);continue;}
   const img=document.createElement('img');img.src=url;img.alt='Dr. '+row.doctor_name;
   img.addEventListener('error',()=>{if(img.parentElement===avatar)avatar.replaceChildren(placeholder);},{once:true});
   avatar.replaceChildren(img);
  }
 }
 async function refresh(){
  if(refreshing||document.visibilityState==='hidden')return;
  refreshing=true;
  try{await window.CarePlusDoctorPhotos(state.client,state.directory,state.tables);render();}
  catch(error){console.error('Prescription photographs could not refresh:',error.message);}
  finally{refreshing=false;}
 }
 render();
 window.addEventListener('focus',refresh);
 window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
});
