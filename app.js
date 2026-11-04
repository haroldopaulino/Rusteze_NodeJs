(() => {
  'use strict';
  const configs = [
    {id:'storage',name:'Storage adapter',icon:'▣',description:'Keeping bits shiny',operations:{writeFile:{name:'interview-demo.txt',content:'The rust is gone. The SDK is strong.'},readFile:{name:'interview-demo.txt'},listFiles:{}}},
    {id:'notifications',name:'Notification adapter',icon:'✉',description:'No email actually sent',operations:{send:{recipient:'interviewer@example.com',message:'Rust-eze says: hello, shiny SDK!'},history:{}}},
    {id:'mysql',name:'MySQL adapter',icon:'▤',description:'Simulated in website',operations:{addNote:{text:'A freshly polished TypeScript thought'},listNotes:{}}}
  ];
  const $ = id => document.getElementById(id);
  if (!$('plugin-list')) return;
  let enabled,files,notifications,notes,events,seq;
  let livePlugins=[];
  const isLive=()=> $('mode-select').value==='live';
  const headers=()=>({'Content-Type':'application/json','X-API-Key':$('api-key').value.trim()});
  async function request(path,options={}){
    const apiPath=path.replace(/^\//,'');
    const response=await fetch(new URL(apiPath, document.baseURI),{...options,headers:{...headers(),...(options.headers||{})}});
    let body;
    try{body=await response.json();}catch{body={error:'Server returned a non-JSON response'};}
    if(!response.ok)throw new Error(`${response.status} — ${body.error||response.statusText}`);
    return body;
  }
  async function refreshLive(){
    const result=await request('/api/plugins');
    livePlugins=result.plugins||[];
    $('connection-status').textContent='Connected to Fastify API · '+livePlugins.filter(p=>p.state==='running').length+' active plugins';
    renderPlugins();
    await refreshLiveEvents();
  }
  async function refreshLiveEvents(){
    const result=await request('/api/events');
    events=(result.events||[]).slice(0,12).map(e=>({name:e.type,details:window.RustezeDateTime.stringify(e.payload).replace(/\s+/g, ' '),time:window.RustezeDateTime.format(e.timestamp)}));
    renderEvents();
  }

  const fmt = value => window.RustezeDateTime.stringify(value);
  const event = (name,details) => { events.unshift({name,details,time:window.RustezeDateTime.format(new Date())}); events=events.slice(0,12); renderEvents(); };
  const renderEvents = () => {
    const list=$('event-list'); list.replaceChildren();
    for(const e of events){const item=document.createElement('div');item.className='event-item';const content=document.createElement('div');const title=document.createElement('b');title.textContent=e.name;const text=document.createElement('p');text.textContent=e.details+' · '+e.time;content.append(title,text);item.append(content);list.append(item);}
  };
  const renderPlugins = () => {
    const list=$('plugin-list');list.replaceChildren();
    for(const cfg of configs){
      const remote=livePlugins.find(p=>p.id===cfg.id);
      const active=isLive()?remote?.state==='running':enabled.has(cfg.id);
      const item=document.createElement('div');item.className='plugin-item';
      const icon=document.createElement('span');icon.className='plugin-icon';icon.textContent=cfg.icon;
      const info=document.createElement('div');info.className='plugin-text';
      const title=document.createElement('strong');title.textContent=cfg.name;
      const subtitle=document.createElement('small');subtitle.textContent=isLive()?`${remote?.state||'unavailable'} · ${remote?.error||cfg.description}`:(active?'● ACTIVE · ':'○ DISABLED · ')+cfg.description;
      info.append(title,subtitle);
      const button=document.createElement('button');button.className='toggle';button.type='button';button.setAttribute('aria-label',`${active?'Disable':'Enable'} ${cfg.name}`);button.setAttribute('aria-pressed',String(active));
      button.addEventListener('click',async()=>{
        if(isLive()){
          try{await request(`/api/plugins/${encodeURIComponent(cfg.id)}/${active?'disable':'enable'}`,{method:'POST'});await refreshLive();}
          catch(error){$('connection-status').textContent='API error: '+error.message;}
        }else{
          if(active){enabled.delete(cfg.id);event('plugin.disabled',cfg.id+' — taking a coffee break');}
          else{enabled.add(cfg.id);event('plugin.enabled',cfg.id+' — back on the job');}
          renderPlugins();
        }
      });
      item.append(icon,info,button);list.append(item);
    }
  };
  const populatePlugins = () => {const select=$('plugin-select');select.replaceChildren();for(const cfg of configs){const opt=document.createElement('option');opt.value=cfg.id;opt.textContent=cfg.name;select.append(opt);}populateOperations();};
  const populateOperations = () => {const cfg=configs.find(p=>p.id===$('plugin-select').value);if(!cfg)return;const select=$('operation-select');select.replaceChildren();Object.keys(cfg.operations).forEach(op=>{const opt=document.createElement('option');opt.value=op;opt.textContent=op;select.append(opt);});populateInput();};
  const populateInput = () => {const cfg=configs.find(p=>p.id===$('plugin-select').value);$('input-json').value=fmt(cfg?.operations[$('operation-select').value]||{});};
  const execute = (plugin,op,data) => {
    if(!enabled.has(plugin))throw new Error(`409 — ${plugin} plugin is disabled. Give it a polish first!`);
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('400 — input must be a JSON object');
    const requireText = (field) => {if(typeof data[field]!=='string'||!data[field].trim())throw new Error(`400 — ${field} must be a non-empty string`);return data[field];};
    if(plugin==='storage'){
      if(op==='writeFile'){const name=requireText('name'),content=requireText('content');if(!/^[a-zA-Z0-9_.-]{1,70}$/.test(name))throw new Error('400 — choose a simple filename without paths');files.set(name,content);return {ok:true,file:name,bytes:new TextEncoder().encode(content).length,storage:'in-memory browser demo'};}
      if(op==='readFile'){const name=requireText('name');if(!files.has(name))throw new Error('404 — File not found in this browser session');return {name,content:files.get(name)};}
      if(op==='listFiles')return {files:Array.from(files.keys()),count:files.size};
    }
    if(plugin==='notifications'){
      if(op==='send'){const recipient=requireText('recipient'),message=requireText('message');const item={id:++seq,recipient,message,status:'simulated-only'};notifications.push(item);return {...item,notice:'No message was sent. Your inbox is safe.'};}
      if(op==='history')return {notifications};
    }
    if(plugin==='mysql'){
      if(op==='addNote'){const text=requireText('text');const item={id:++seq,text};notes.push(item);return {note:item,storage:'in-memory mock, NOT MySQL'};}
      if(op==='listNotes')return {notes,storage:'in-memory mock, NOT MySQL'};
    }
    throw new Error(`404 — Unknown operation: ${plugin}.${op}`);
  };
  const reset = () => {enabled=new Set(configs.map(p=>p.id));files=new Map([['welcome.txt','Rust-eze: scrape away the rust, not the quality.']]);notes=[];notifications=[];events=[];seq=0;renderPlugins();populatePlugins();event('sdk.initialized','3 plugins registered · zero databases harmed');$('operation-output').textContent='// All polished. Select an operation and press Execute.';};
  $('plugin-select').addEventListener('change',populateOperations);
  $('operation-select').addEventListener('change',populateInput);
  $('run-operation').addEventListener('click',async()=>{
    const plugin=$('plugin-select').value,op=$('operation-select').value;
    try{const data=JSON.parse($('input-json').value);const result=isLive()?(await request('/api/execute',{method:'POST',body:JSON.stringify({pluginId:plugin,operation:op,input:data})})).result:execute(plugin,op,data);$('operation-output').textContent=fmt({ok:true,result,mode:isLive()?'live API':'browser simulation'});if(isLive())await refreshLive();else event('operation.completed',`${plugin}.${op}`);}
    catch(error){$('operation-output').textContent=fmt({ok:false,error:error instanceof Error?error.message:String(error)});if(!isLive())event('operation.failed',`${plugin}.${op}`);else $('connection-status').textContent=error.message;}
  });
  $('reset-demo').addEventListener('click',()=>{
    if(isLive()){$('connection-status').textContent='Live backend data is persistent; use browser mode to reset the mock.';return;}
    reset();
  });
  $('mode-select').addEventListener('change',async()=>{
    const live=isLive();
    $('mode-indicator').textContent=live?'LIVE MODE · REAL API':'STATIC MODE · NO BACKEND';
    $('connection-status').textContent=live?'Connecting to API...':'Browser mode is ready.';
    if(live){try{await refreshLive();}catch(error){livePlugins=[];renderPlugins();$('connection-status').textContent='API unavailable: '+error.message;}}
    else reset();
  });
  $('check-api').addEventListener('click',async()=>{
    try{await refreshLive();}catch(error){$('connection-status').textContent='API unavailable: '+error.message;}
  });
  $('year').textContent=String(new Date().getFullYear());
  reset();
})();
