document.addEventListener('DOMContentLoaded',()=>{
 const mount=document.getElementById('resultsContainer');if(!mount)return;
 const make=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
 const card=make('section',null,'card');
 const heading=make('div',null,'card-header');heading.append(make('h2','Condition Reference · ICD-10-CM FY2027','card-title'));
 const body=make('div',null,'card-body');
 body.append(make('p','Search the CDC coding reference by code or English description. These entries are not diagnoses or symptom-screening rules.'));
 const form=make('form'),label=make('label','Code or condition name','form-label'),input=make('input',null,'form-control');
 input.id='condition-search';input.name='condition';input.type='search';input.minLength=2;input.maxLength=120;input.required=true;label.htmlFor=input.id;
 const button=make('button','Search Reference','btn btn-outline');button.type='submit';
 const status=make('p');status.setAttribute('role','status');
 const list=make('ul');form.append(label,input,button);body.append(form,status,list);card.append(heading,body);mount.after(card);
 form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;status.textContent='Searching…';list.replaceChildren();
  try{
   const result=await window.CarePlusOriginalData.client.rpc('careplus_search_conditions',{p_query:input.value.trim()});
   if(result.error)throw result.error;
   for(const row of result.data||[])list.append(make('li',row.code+' · '+row.description));
   status.textContent=result.data?.length?'Showing up to 30 matching reference entries.':'No matching reference entries. Try a code or another English term.';
  }catch(error){status.textContent=error.message||'Reference search is unavailable.';}
  finally{button.disabled=false;}
 });
});
