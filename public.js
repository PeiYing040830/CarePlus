document.addEventListener('DOMContentLoaded', () => {
  const form=document.getElementById('contactForm');
  if(form)form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('[type="submit"]');
    let status=form.querySelector('[role="status"]');
    if(!status){status=document.createElement('p');status.setAttribute('role','status');status.className='demo-status';form.append(status);}
    button.disabled=true;status.textContent='Sending…';
    try{
      const data=Object.fromEntries(new FormData(form));
      const result=await window.getCarePlusClient().rpc('careplus_action',{p_action:'contact',p_data:data});
      if(result.error)throw result.error;
      form.reset();status.textContent='Message sent to the clinic.';
    }catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  const grid=document.getElementById('doctors-grid');
  if(grid)(async()=>{
    try{
      const {data,error}=await window.getCarePlusClient().rpc('careplus_doctors');if(error)throw error;
      grid.replaceChildren();
      if(!data.length){const p=document.createElement('p');p.textContent='No active doctors are currently available.';grid.append(p);}
      for(const doctor of data){
        const card=document.createElement('article');card.className='doctor-card';
        const info=document.createElement('div');info.className='doctor-info';
        for(const [tag,text] of [['h2','Dr. '+doctor.name],['p',doctor.specialization||'General Practice'],['p',doctor.bio||''],['p','Consultation fee: RM '+Number(doctor.consultation_fee||0).toFixed(2)],['p',(doctor.available_days||[]).join(', ')+' · '+(doctor.available_hours||'Contact clinic')]]){
          const el=document.createElement(tag);el.textContent=text;info.append(el);
        }
        const a=document.createElement('a');a.href='login.html';a.textContent='Sign in to book';info.append(a);card.append(info);grid.append(card);
      }
    }catch(error){grid.textContent='Unable to load doctors: '+error.message;}
  })();
});
