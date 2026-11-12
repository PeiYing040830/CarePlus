/* Compile original view markup, without executing or copying its PHP backend.
   npm install --prefix ../../.careplus-test-tools --no-save php-parser
   Run from this repository: node tools/restore_design.cjs */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Parser=require('../../.careplus-test-tools/node_modules/php-parser');
const root=path.resolve(__dirname,'../..'),out=path.resolve(__dirname,'..');
const parser=new Parser.Engine({parser:{suppressErrors:false},ast:{withPositions:true}});
let sequence=0;
const j=JSON.stringify;
function expr(n,lvalue=false){
 if(!n)return 'null';
 switch(n.kind){
  case 'variable':return 'c['+j(n.name)+']';
  case 'string':return j(n.value);
  case 'number':return String(n.value);
  case 'boolean':return String(n.value);
  case 'nullkeyword':return 'null';
  case 'name':return 'p.constant('+j(n.name)+',c)';
  case 'identifier':return j(n.name);
  case 'magic':return j(n.value==='__DIR__'?'/':n.value);
  case 'offsetlookup':return lvalue?expr(n.what)+'['+expr(n.offset)+']':'p.get('+expr(n.what)+','+expr(n.offset)+')';
  case 'propertylookup':return 'p.get('+expr(n.what)+','+j(n.offset.name)+')';
  case 'bin':{
   const a=expr(n.left),b=expr(n.right);
   if(n.type==='.')return '(p.str('+a+')+p.str('+b+'))';
   if(n.type==='and'||n.type==='&&')return '(p.truth('+a+')&&p.truth('+b+'))';
   if(n.type==='or'||n.type==='||')return '(p.truth('+a+')||p.truth('+b+'))';
   if(n.type==='<=>')return 'Math.sign('+a+'-'+b+')';
   return '('+a+' '+n.type+' '+b+')';
  }
  case 'retif':return '(p.truth('+expr(n.test)+')?'+expr(n.trueExpr||n.test)+':'+expr(n.falseExpr)+')';
  case 'unary':return n.type==='!'?'(!p.truth('+expr(n.what)+'))':'('+n.type+expr(n.what)+')';
  case 'empty':return '(!p.truth('+expr(n.expression)+'))';
  case 'isset':return '('+n.variables.map(v=>expr(v)+'!=null').join('&&')+')';
  case 'cast':return ['int','integer','float','double'].includes(n.type)?'Number('+expr(n.expr)+'||0)':'p.str('+expr(n.expr)+')';
  case 'array':return 'p.array(['+n.items.map(e=>'['+expr(e.key)+','+expr(e.value)+']').join(',')+'])';
  case 'assign':return '('+expr(n.left,true)+' '+(n.operator==='.'?'+=':n.operator||'=')+' '+expr(n.right)+')';
  case 'post':return '('+expr(n.what,true)+(n.type==='+'?'++':n.type==='-'?'--':n.type)+')';
  case 'call':
   if(n.what.kind==='propertylookup')return 'p.method('+expr(n.what.what)+','+j(n.what.offset.name)+',['+n.arguments.map(a=>expr(a)).join(',')+'])';
   // Server filesystem prefixes are invalid for private Storage signed URLs.
   if(n.what.name==='file_exists'){
    let target=n.arguments[0];while(target?.kind==='bin'&&target.type==='.')target=target.right;
    return 'p.call("file_exists",['+expr(target)+'],c)';
   }
   return 'p.call('+j(n.what.name)+',['+n.arguments.map(a=>expr(a)).join(',')+'],c)';
  default:throw new Error('Unsupported expression '+n.kind+' at '+JSON.stringify(n.loc?.start));
 }
}
function stmt(n){
 if(!n)return '';
 switch(n.kind){
  case 'program':case 'block':return n.children.map(stmt).join('\n');
  case 'inline':return 'html+='+j(n.value)+';';
  case 'echo':return n.expressions.map(e=>'html+=p.str('+expr(e)+');').join('\n');
  case 'expressionstatement':if(n.expression.kind==='include')throw new Error('Include must be inlined');return expr(n.expression)+';';
  case 'if':return 'if(p.truth('+expr(n.test)+')){'+stmt(n.body)+'}'+(n.alternate?'else{'+stmt(n.alternate)+'}':'');
  case 'foreach':{const name='_entry'+sequence++;return 'for(const '+name+' of p.entries('+expr(n.source)+')){'+(n.key?expr(n.key,true)+'='+name+'[0];':'')+expr(n.value,true)+'='+name+'[1];'+stmt(n.body)+'}';}
  case 'while':return 'while(p.truth('+expr(n.test)+')){'+stmt(n.body)+'}';
  case 'for':return 'for('+n.init.map(e=>expr(e)).join(',')+';'+n.test.map(e=>expr(e)).join(',')+';'+n.increment.map(e=>expr(e)).join(',')+'){'+stmt(n.body)+'}';
  case 'switch':return 'switch('+expr(n.test)+'){'+n.body.children.map(stmt).join('\n')+'}';
  case 'case':return (n.test?'case '+expr(n.test):'default')+':'+stmt(n.body);
  case 'break':return 'break;';
  case 'unset':return n.variables.map(v=>'delete '+expr(v,true)+';').join('\n');
  case 'commentline':case 'commentblock':return '';
  default:throw new Error('Unsupported statement '+n.kind+' at '+JSON.stringify(n.loc?.start));
 }
}
function header(file){
 let s=fs.readFileSync(file,'utf8');if(s.startsWith('<?php'))s=s.slice(s.indexOf('?>')+2);
 if(['patient','doctor','admin'].includes(path.basename(path.dirname(file))))s=s.replace(/(<link\b[^>]*href="headerNav\.css[^\"]*"[^>]*>)/,'$1\n<link rel="stylesheet" href="../original-design/header-layout.css">');
 // Remove the invalid second document wrapper in the original guest header.
 return s.replace(/<!doctype[^>]*>|<\/?(?:html|head|body)\b[^>]*>|<meta\b[^>]*>/gi,'');
}
function source(file){
 const s=fs.readFileSync(file,'utf8');const start=s.search(/<!doctype/i);if(start<0)return null;
 let markup=path.basename(file)==='terms.php'?s.slice(start).replace('src="services.js"','src="terms.js"'):s.slice(start);
 // Supabase recovers accounts by email; omit the old security-question section.
 if(path.basename(file)==='registration.php'){
  const section=/<h3 class="section-title">[^<]*Account Recovery Setup<\/h3>[\s\S]*?(?=<h3 class="section-title">Personal Information<\/h3>)/;
  if(!section.test(markup))throw new Error('Legacy registration recovery section not found.');
  markup=markup.replace(section,'');
 }
 if(path.basename(file)==='dashboard.php'&&path.basename(path.dirname(file))==='patient')markup=markup.replace(/\$cleanImageName = ltrim[\s\S]*?\$hasImage = file_exists\(\$serverPath\);/,"$imagePath = $doctor['profile_picture']; $hasImage = file_exists($imagePath);");
 if(path.basename(file)==='appointment.php'&&path.basename(path.dirname(file))==='patient')markup=markup.replace(/\$profilePicturePath = [\s\S]*?(?=\?>)/,"$displayPath = $doctor['profile_picture'] ?? null;\n");
 markup=markup.replace(/\$imagePath = '\.\.\/' \. \$doctor\['profile_picture'\];/g,"$imagePath = $doctor['profile_picture'];").replace("file_exists(__DIR__ . '/' . $imagePath)","file_exists($imagePath)");
 if(path.basename(file)==='symptomChecker.php')markup=markup.replace('else $routineCount++;',"elseif ($check['urgency_level'] === 'routine') $routineCount++;").replaceAll('View Full Analysis','View Details').replace('This is a preliminary assessment tool.','This is a prototype rule-based screening tool; it has not been clinically validated.').replace('</head>','<script src="../original-design/condition-catalog.js" defer></script></head>');
 if(path.basename(file)==='payment.php'&&path.basename(path.dirname(file))==='patient'){
  markup=markup.replaceAll('file_exists($physicalPath)','file_exists($dbPath)').replace('<span class="text-muted-small">-</span>','<span class="text-muted-small">Not reviewed</span>').replace('<span class="text-muted-small">-</span>','<span class="text-muted-small">No action required</span>');
  markup=markup.replace(/<td>\s*<\?php if \(\$apt\['payment_status'\] === 'completed'\): \?>[\s\S]*?<\/td>/,'<td><span class="status-badge status-<?php echo htmlspecialchars($apt[\'payment_badge\']); ?>"><?php echo htmlspecialchars($apt[\'payment_label\']); ?></span></td>');
  markup=markup.replace("elseif ($apt['payment_status'] === 'pending'):","elseif (in_array($apt['payment_status'], ['pending', 'failed']) && $apt['appointment_status'] !== 'cancelled'):");
  markup=markup.replace(/onclick="(editReview|openReviewModal|viewPaymentDetails)\([^\"]*"/g,(tag,fn)=>{
   const variable=tag.includes('$review[')?'review':'apt';
   return 'onclick="'+(fn==='editReview'?'editReviewByAppointment':fn==='viewPaymentDetails'?'viewPaymentByAppointment':'openReviewByAppointment')+'(<?php echo (int)$'+variable+'[\'appointment_id\']; ?>)"';
  });
 }
 // Some legacy pages reference stylesheets that never existed; their styles are inline.
 markup=markup.replace(/<link\b[^>]*href="([^"\n]+\.css)"[^>]*>/gi,(tag,href)=>/^https?:|^\/\//.test(href)||fs.existsSync(path.resolve(path.dirname(file),href))?tag:'');
 return markup.replace(/<\?php\s+(?:include|require)(?:_once)?\s+([^;]+);?\s*\?>/g,(all,raw)=>{
  const name=raw.match(/['"]([^'"]+\.php)['"]/);if(!name)throw new Error('Unknown include '+raw);
  const full=path.resolve(path.dirname(file),'.'+name[1].replace(/^\.?\//,'/'));
  const actual=fs.existsSync(full)?full:path.join(path.dirname(file),path.basename(name[1]));
  if(path.basename(actual)!=='headerNav.php')throw new Error('Unexpected view include '+actual);
  return header(actual);
 });
}
const files=[];
for(const dir of ['','patient','doctor','admin'])for(const name of fs.readdirSync(path.join(root,dir)))if(name.endsWith('.php')&&name!=='headerNav.php'&&name!=='logout.php'){
 const file=path.join(root,dir,name),s=source(file);if(s)files.push({file,name:path.posix.join(dir,name.replace(/\.php$/,'.html')),source:s});
}
let bundle='/* Generated solely from original XAMPP view markup. No records or server code. */\nwindow.CarePlusOriginalViews={};\n';
for(const item of files){
 try{
  const ast=parser.parseCode(item.source,item.file);const compiled=stmt(ast);
  bundle+='window.CarePlusOriginalViews['+j(item.name)+']=function(c,p){let html="";'+compiled+';return html;};\n';
 }catch(error){throw new Error(item.name+': '+error.message);}
}
fs.mkdirSync(path.join(out,'original-design'),{recursive:true});
fs.writeFileSync(path.join(out,'original-design/views.js'),bundle);
const manifest={};
for(const item of files){
 const rel=path.dirname(item.name)==='.'?'':path.dirname(item.name);
 fs.mkdirSync(path.join(out,rel),{recursive:true});
 for(const name of fs.readdirSync(path.join(root,rel)))if(/\.(css|js|png)$/.test(name)&&!['Ajax.js','Database.js','script.js'].includes(name)){
  if(name.endsWith('.js')){
   let js=fs.readFileSync(path.join(root,rel,name),'utf8').replace(/\.php\b/g,'.html').replace(/[\t ]+$/gm,'');
   if(rel==='patient'&&name==='prescription.js')js=js.replace('src="../${prescription.doctor_profile_picture}"','src="${prescription.doctor_profile_picture}"').replace('${prescription.doctor_phone}','${prescription.doctor_phone || \'Not provided\'}');
   if(rel==='patient'&&name==='symptomChecker.js'){
    js=js.replace('You can schedule a regular appointment with your doctor.','Routine rule matched. This does not rule out serious illness.').replace('You should see a doctor within 24-48 hours.','Contact a healthcare professional promptly for assessment.');
    js=js.replace('let urgencyIcon =',"if (check.urgency_level === 'unassessed') urgencyText = 'Not assessed';\n            let urgencyIcon =");
    js=js.replace("// Show detected scopes count","if (data.urgency === 'unassessed') { urgencyText = 'Not assessed'; urgencyMessage = 'No matching rule was found. A healthcare professional should assess these symptoms.'; }\n    // Show detected scopes count");
    js=js.replaceAll('Database Analysis Results','Rule-based Screening Results').replaceAll('Database Analysis','Rule-based Screening').replaceAll('View Full Analysis','View Details').replace('Analysis completed successfully!','Screening saved. This is a prototype rule-based result.').replace("showAlert('Unable to connect to the server. Please check console for details.', 'error');","showAlert(error.message || 'Unable to save symptoms. Please try again.', 'error');");
   }
   fs.writeFileSync(path.join(out,rel,name),js.trimEnd()+'\n');
  }
  else if(name.endsWith('.css'))fs.writeFileSync(path.join(out,rel,name),fs.readFileSync(path.join(root,rel,name),'utf8').replace(/[\t ]+$/gm,''));
  else fs.copyFileSync(path.join(root,rel,name),path.join(out,rel,name));
 }
 const prefix=rel?'../':'';
 const shell='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CarePlus</title></head><body><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script><script src="'+prefix+'supabase-config.js"></script><script src="'+prefix+'supabase-client.js"></script><script src="'+prefix+'original-design/php-view-runtime.js"></script><script src="'+prefix+'original-design/context.js"></script><script src="'+prefix+'original-design/views.js"></script><script src="'+prefix+'original-design/photos.js"></script><script src="'+prefix+'original-design/bootstrap.js"></script></body></html>';
 if(item.name!=='forgotPassword.html')fs.writeFileSync(path.join(out,item.name),shell);
 manifest[item.name]={original:path.relative(root,item.file).replaceAll('\\','/'),css:fs.existsSync(path.join(root,rel,path.basename(item.name,'.html')+'.css'))?path.posix.join(rel,path.basename(item.name,'.html')+'.css'):null};
}
// Recovery pages are maintained separately for the Supabase email flow.
for(const role of ['patient','doctor','admin'])fs.writeFileSync(path.join(out,role+'.html'),'<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CarePlus</title></head><body><script>location.replace('+j(role+'/dashboard.html')+'+location.search+location.hash);</script></body></html>');
// Ship runtime + context + views together so cached modules cannot disagree.
fs.writeFileSync(path.join(out,'original-design/app-core.js'),['php-view-runtime','context','views','photos','bootstrap'].map(name=>fs.readFileSync(path.join(out,'original-design',name+'.js'),'utf8')).join('\n;\n'));
const versions={};
for(const dir of ['','patient','doctor','admin','original-design'])for(const name of fs.readdirSync(path.join(out,dir)))if(/\.(js|css)$/.test(name)){
 versions[path.posix.join(dir,name)]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,dir,name))).digest('hex').slice(0,16);
}
for(const dir of ['','patient','doctor','admin'])for(const name of fs.readdirSync(path.join(out,dir)))if(name.endsWith('.html')){
 const file=path.join(out,dir,name);let html=fs.readFileSync(file,'utf8');
 if(html.includes('original-design/bootstrap.js'))html=html.replace(/<script src="[^"\n]*original-design\/(?:php-view-runtime|context|views|photos|bootstrap)\.js"><\/script>/g,'').replace('</body>','<script src="'+(dir?'../':'')+'original-design/app-core.js"></script></body>');
 html=html.replace(/<script>window\.CarePlusAssetVersions=[\s\S]*?<\/script>/g,'');
 if(html.includes('original-design/app-core.js'))html=html.replace(/<head>/i,'<head><script>window.CarePlusAssetVersions='+JSON.stringify(versions)+';</script>');
 html=html.replace(/\b(src|href)="([^"]+)"/g,(tag,attr,value)=>{
  const url=new URL(value,'https://assets.test/'+(dir?dir+'/':''));if(url.origin!=='https://assets.test')return tag;
  const version=versions[url.pathname.slice(1)];if(!version)return tag;
  url.searchParams.set('v',version);return attr+'="'+value.split(/[?#]/)[0]+url.search+url.hash+'"';
 });
 fs.writeFileSync(file,html);
}
fs.copyFileSync(path.join(out,'index.html'),path.join(out,'logout.html'));
fs.writeFileSync(path.join(out,'original-design/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Compiled '+files.length+' original pages; copied their original CSS, JavaScript and logo assets.');
