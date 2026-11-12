/* Compiled into the original activity script; match literal search text safely. */
function highlightSearchTerms() {
 const term=new URLSearchParams(location.search).get('search');if(!term)return;
 const needle=term.toLowerCase();
 for(const element of document.querySelectorAll('.activity-card .activity-title, .activity-card .activity-detail')){
  const text=element.textContent,lower=text.toLowerCase(),fragment=document.createDocumentFragment();
  let offset=0,index=lower.indexOf(needle);
  while(index!==-1){
   fragment.append(document.createTextNode(text.slice(offset,index)));
   const mark=document.createElement('mark');mark.textContent=text.slice(index,index+term.length);fragment.append(mark);
   offset=index+term.length;index=lower.indexOf(needle,offset);
  }
  fragment.append(document.createTextNode(text.slice(offset)));element.replaceChildren(fragment);
 }
}
