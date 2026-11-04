const collectionUrl='/postman/Rust-eze.postman_collection.json';
const $=id=>document.getElementById(id);
const jokes=[
  'This endpoint has been inspected. It claims the stack trace was already there.',
  'If this request returns 200, please act surprised. It took practice.',
  'No SDKs were harmed. A few semicolons remain unaccounted for.',
  'The only rust here should be in the logo, not your response headers.',
  'Works on my machine is now a test case, not a deployment strategy.',
  'Every HTTP status code has a story. Some are better left in the logs.'
];
let entries=[];
let current=null;
const string=value=>typeof value==='string'?value:JSON.stringify(value??'',null,2);
const formatJson=value=>value===null||value===undefined?'—':JSON.stringify(value,null,2);
function flatten(items,folder=''){
  const result=[];
  for(const item of items||[]){
    const path=folder?`${folder} / ${item.name}`:item.name;
    if(item.request)result.push({item,folder,name:item.name,path});
    if(item.item)result.push(...flatten(item.item,path));
  }
  return result;
}
function requestUrl(req){
  const url=req?.url;
  return typeof url==='string'?url:(url?.raw||'');
}
function method(req){return (req?.method||'GET').toUpperCase()}
function getBody(req){const body=req?.body;if(!body)return 'No request body';if(body.mode==='raw')return body.raw||'';return JSON.stringify(body,null,2)}
function getHeaders(req){const headers=req?.header||[];return headers.length?headers.map(h=>`${h.key}: ${h.value||''}`).join('\n'):'No custom headers'}
function getScripts(item){const events=item.event||[];return events.map(e=>`[${e.listen}]\n${(e.script?.exec||[]).join('\n')}`).join('\n\n')||'No scripts for this request'}
function shellQuote(text){return "'"+String(text).replaceAll("'","'\\''")+"'"}
function curlFor(req){
  const url=requestUrl(req).replaceAll('{{baseUrl}}','https://appdevdesign.com:8123');
  let lines=[`curl -i -X ${method(req)} ${shellQuote(url)}`];
  for(const header of req.header||[])if(!header.disabled)lines.push(`  -H ${shellQuote(`${header.key}: ${String(header.value||'').replaceAll('{{adminApiKey}}','booya-admin-key')}`)}`);
  const body=req.body;
  if(body?.mode==='raw')lines.push(`  --data-raw ${shellQuote(body.raw||'')}`);
  return lines.join(' \\\n');
}
function renderList(filter=''){
 const root=$('request-list');root.replaceChildren();
 const query=filter.trim().toLowerCase();let shown=0;
 const groups=new Map();
 for(const entry of entries){
   if(query&&!`${entry.path} ${method(entry.item.request)} ${requestUrl(entry.item.request)}`.toLowerCase().includes(query))continue;
   const group=entry.folder||'Ungrouped';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(entry);shown++;
 }
 for(const [folder,requests] of groups){
  const details=document.createElement('details');details.className='folder';details.open=true;
  const summary=document.createElement('summary');summary.textContent=`${folder} (${requests.length})`;details.append(summary);
  for(const entry of requests){
   const button=document.createElement('button');button.type='button';button.className='request-button';button.setAttribute('aria-current',String(current===entry));
   const methodBadge=document.createElement('span');methodBadge.className=`method ${method(entry.item.request).toLowerCase()}`;methodBadge.textContent=method(entry.item.request);
   const name=document.createElement('span');name.textContent=entry.name;
   button.append(methodBadge,name);button.addEventListener('click',()=>select(entry));details.append(button);
  }
  root.append(details);
 }
 $('count').textContent=`${shown} / ${entries.length}`;
 $('sidebar-status').textContent=shown?`${groups.size} folders · ${shown} requests`:'No matching requests. Even the 404s are hiding.';
}
function select(entry){
 current=entry;
 const req=entry.item.request||{};
 $('placeholder').hidden=true;$('request-content').hidden=false;
 $('method').textContent=method(req);$('method').className=`method ${method(req).toLowerCase()}`;
 $('request-name').textContent=entry.path;
 $('request-description').textContent=typeof req.description==='string'?(req.description||'No description. A mysterious endpoint, but a documented one.'):req.description?.content||'No description.';
 $('endpoint').textContent=requestUrl(req).replaceAll('{{baseUrl}}','https://appdevdesign.com:8123');
 $('headers').textContent=getHeaders(req);
 $('body').textContent=getBody(req);
 $('tests').textContent=getScripts(entry.item);
 $('curl').textContent=curlFor(req);
 $('raw').textContent=formatJson(entry.item);
 $('joke').textContent=jokes[entries.indexOf(entry)%jokes.length];
 renderList($('search').value);
 if(window.innerWidth<821)$('request-detail').scrollIntoView({behavior:'smooth',block:'start'});
}
async function copy(text,button){
 try{await navigator.clipboard.writeText(text);const previous=button.textContent;button.textContent='Copied!';setTimeout(()=>{button.textContent=previous},1200)}
 catch{button.textContent='Select text to copy'}
}
$('search').addEventListener('input',e=>renderList(e.target.value));
$('copy-url').addEventListener('click',()=>copy($('endpoint').textContent,$('copy-url')));
$('copy-curl').addEventListener('click',()=>copy($('curl').textContent,$('copy-curl')));
fetch(collectionUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}).then(collection=>{
 entries=flatten(collection.item);
 renderList();
 if(entries.length)select(entries[0]);
}).catch(error=>{
 $('sidebar-status').textContent=`Could not load collection: ${error.message}`;
 $('placeholder').querySelector('p').textContent='Collection could not be loaded. Check the server and the download link.';
});
