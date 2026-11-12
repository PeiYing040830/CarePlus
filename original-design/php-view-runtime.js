/* View-only PHP expression compatibility. No PHP interpreter or SQL is shipped. */
window.CarePlusViewPHP=(()=>{
 const positions=new WeakMap();
 const str=v=>v==null||v===false?'':v===true?'1':String(v);
 const truth=v=>!(v==null||v===false||v===0||v===''||v==='0'||(Array.isArray(v)&&!v.length));
 const entries=v=>Array.isArray(v)?v.map((x,i)=>[i,x]):v&&typeof v==='object'?Object.entries(v):[];
 const vals=v=>entries(v).map(e=>e[1]);
 const escape=v=>str(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
 function timestamp(value,base=Date.now()/1000){
  if(value==null||value==='')return base;
  if(typeof value==='number')return value;
  const s=str(value).trim();
  const rel=s.match(/^([+-]?\d+)\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/i);
  if(rel)return base+Number(rel[1])*({second:1,minute:60,hour:3600,day:86400,week:604800,month:2629800,year:31557600})[rel[2].toLowerCase().replace(/s$/,'')];
  if(s==='now')return Date.now()/1000;
  const normalized=/^\d{2}:\d{2}/.test(s)?date('Y-m-d')+'T'+s+'+08:00':/^\d{4}-\d{2}-\d{2}(?: |T)\d{2}:\d{2}/.test(s)&&!/[Zz]|[+-]\d\d:\d\d$/.test(s)?s.replace(' ','T')+'+08:00':s;
  const parsed=Date.parse(normalized);return Number.isNaN(parsed)?0:parsed/1000;
 }
 function date(format,seconds=Date.now()/1000){
  const d=new Date(Number(seconds)*1000);if(Number.isNaN(d.getTime()))return '';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit',weekday:'long',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
  const month=Number(parts.month),hour=Number(parts.hour),week=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(parts.weekday);
  const names=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const map={Y:parts.year,y:parts.year.slice(-2),m:parts.month,n:month,d:parts.day,j:Number(parts.day),F:names[month-1],M:names[month-1].slice(0,3),l:parts.weekday,D:parts.weekday.slice(0,3),w:week,N:week||7,H:parts.hour,G:hour,h:String(hour%12||12).padStart(2,'0'),g:hour%12||12,i:parts.minute,s:parts.second,a:hour>=12?'pm':'am',A:hour>=12?'PM':'AM',t:new Date(Number(parts.year),month,0).getDate(),U:Math.floor(Number(seconds))};
  let escaped=false;return str(format).split('').map(c=>{if(escaped){escaped=false;return c;}if(c==='\\'){escaped=true;return '';}return map[c]??c;}).join('');
 }
 function ageParts(birth,today=date('Y-m-d')){
  const empty={years:0,months:0,days:0,total_days:0};
  const parse=value=>{
   const match=str(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return null;
   const [year,month,day]=match.slice(1).map(Number),stamp=Date.UTC(year,month-1,day),d=new Date(stamp);
   return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?{year,month,day,stamp}:null;
  };
  const start=parse(birth),end=parse(today);if(!start||!end||start.stamp>end.stamp)return empty;
  let years=end.year-start.year,months=end.month-start.month,days=end.day-start.day,borrowMonth=end.month-1,borrowYear=end.year;
  while(days<0){
   days+=new Date(Date.UTC(borrowYear,borrowMonth,0)).getUTCDate();months--;borrowMonth--;
   if(borrowMonth===0){borrowMonth=12;borrowYear--;}
  }
  if(months<0){years+=Math.floor(months/12);months=((months%12)+12)%12;}
  return {years,months,days,total_days:Math.floor((end.stamp-start.stamp)/86400000)};
 }
 const functions={
  htmlspecialchars:escape,html_entity_decode:v=>{const t=document.createElement('textarea');t.innerHTML=str(v);return t.value;},
  date,strtotime:timestamp,time:()=>Date.now()/1000,session_id:()=>window.CarePlusOriginalData?.user?.id||'guest',
  count:v=>entries(v).length,strlen:v=>str(v).length,substr:(v,start,len)=>len==null?str(v).slice(Number(start)):str(v).substr(Number(start),Number(len)),
  explode:(sep,v)=>str(v).split(sep),strtolower:v=>str(v).toLowerCase(),strtoupper:v=>str(v).toUpperCase(),ucfirst:v=>str(v).charAt(0).toUpperCase()+str(v).slice(1),
  intval:v=>parseInt(v,10)||0,floor:Math.floor,round:(v,d=0)=>Math.round(Number(v)*10**d)/10**d,abs:Math.abs,max:(...v)=>Math.max(...(v.length===1&&Array.isArray(v[0])?v[0]:v)),min:(...v)=>Math.min(...v),
  number_format:(v,d=0)=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:Number(d),maximumFractionDigits:Number(d)}),
  json_encode:v=>JSON.stringify(v??null).replaceAll('<','\\u003c'),
  in_array:(v,a)=>vals(a).some(x=>String(x)===String(v)),array_slice:(a,start,len)=>vals(a).slice(start,len==null?undefined:Number(start)+Number(len)),
  array_map:(fn,a)=>vals(a).map(v=>(functions[fn]||str)(v)),
  str_replace:(search,repl,value)=>{for(const [i,s] of (Array.isArray(search)?search:[search]).entries())value=str(value).split(str(s)).join(str(Array.isArray(repl)?repl[i]:repl));return value;},
  ltrim:(v,chars)=>chars?str(v).replace(new RegExp('^['+str(chars).replace(/[\]\\^-]/g,'\\$&')+']+'),''):str(v).trimStart(),
  basename:v=>str(v).split('/').pop(),file_exists:v=>/^https?:|^blob:/.test(str(v)),
  addslashes:v=>str(v).replace(/['"\\]/g,'\\$&'),nl2br:v=>str(v).replace(/\n/g,'<br>'),str_pad:(v,len,pad=' ',type)=>type===0?str(v).padStart(Number(len),pad):str(v).padEnd(Number(len),pad),
  urlencode:v=>encodeURIComponent(str(v)),isLoggedIn:()=>Boolean(window.CarePlusOriginalData?.user),
  date_create:v=>timestamp(v),date_diff:(a,b)=>({y:Math.floor(Math.abs(b-a)/31557600),days:Math.floor(Math.abs(b-a)/86400)}),
  getStarDisplay:v=>'★'.repeat(Math.round(Number(v)||0))+'☆'.repeat(5-Math.round(Number(v)||0))
 };
 return {str,truth,entries,escape,date,timestamp,ageParts,
  get:(v,key)=>key==='num_rows'&&Array.isArray(v)?v.length:v?.[key]??null,
  constant:(name,c)=>({SITE_NAME:'CarePlus - Smart Clinic Management Portal',SITE_URL:window.CarePlusOriginalBase?.replace(/\/$/,''),STR_PAD_LEFT:0,ENT_QUOTES:3,JSON_HEX_TAG:1,JSON_HEX_APOS:4,JSON_HEX_QUOT:8,JSON_HEX_AMP:2}[name]??c[name]??null),
  array:pairs=>{if(pairs.every(([key])=>key===null))return pairs.map(x=>x[1]);const result={};let index=0;for(const [key,value]of pairs)result[key??index++]=value;return result;},
  method:(value,name,args)=>{if(!Array.isArray(value))return null;if(name==='data_seek'){positions.set(value,Number(args[0]));return true;}if(name==='fetch_all')return value;if(name==='fetch_assoc'){const pos=positions.get(value)||0;positions.set(value,pos+1);return value[pos]||null;}return null;},
  call:(name,args,c)=>{if(!functions[name])throw new Error('Unsupported original view helper: '+name);return functions[name](...args);}
 };
})();
