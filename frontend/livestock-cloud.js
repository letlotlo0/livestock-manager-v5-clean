/* Livestock Manager v5 isolated preview sync.
 * Each animal and photo receives a separate server version. Existing pages
 * keep their localStorage interface; server writes are acknowledged before
 * reporting "Cloud synced". No v4 farm-data migration is performed.
 */
(function(){
 'use strict';
 const M=window.LMV5Merge;
 if(!M)throw Error('v5-merge.js must load before livestock-cloud.js');
 const DOCS=['livestockProfiles','farmerProfile','growthRecords','healthRecords','animalHealthStatuses',
  'livestockHealthRecords','livestockVaccinations','soldLivestock','farmFeedPurchases','livestockGrowth',
  'weaningRecords','farmExpenses','farmOperations'];
 const synced=new Set(['livestockAnimals',...DOCS]);
 const OBJECT_DOCS=new Set(['farmerProfile','animalHealthStatuses']);
 const getRaw=Storage.prototype.getItem,setRaw=Storage.prototype.setItem;
 let userId='',meta=null,ready=false,busy=false,poller=null,delay=null,formDirty=false,pageReady=false;
 let status={state:'syncing',message:'Connecting to V5 test cloud…'};
 const farm=()=>window.LMFarms?.getActiveId?.()||'main';
 const localKey=key=>'lm_v2_'+userId+(farm()==='main'||['livestockProfiles','farmerProfile'].includes(key)?'':'_farm_'+farm())+'_'+key;
 const metaKey=()=> 'lm_v5_sync_'+userId+(farm()==='main'?'':'_farm_'+farm());
 function readRaw(key){return getRaw.call(localStorage,key);}
 function writeRaw(key,value){setRaw.call(localStorage,key,String(value));}
 function getData(key){let raw=readRaw(localKey(key));try{return raw===null?null:JSON.parse(raw);}catch(_){throw Error('Invalid local '+key+' JSON. Export your device backup.');}}
 function setData(key,data){writeRaw(localKey(key),JSON.stringify(data));}
 function defaultMeta(){return {baselines:{},docBaselines:{},docVersions:{},pending:false,conflicts:{},created:'v5'};}
 function loadMeta(){try{const m=JSON.parse(readRaw(metaKey())||'null');if(m&&m.created==='v5'&&m.baselines&&m.docBaselines&&m.docVersions&&m.conflicts)return m;}catch(_){}return null;}
 function persist(){if(userId&&meta)writeRaw(metaKey(),JSON.stringify(meta));}
 function report(state,message){status={state,message};window.dispatchEvent(new CustomEvent('livestock:sync',{detail:status}));}
 async function call(path,{method='GET',body}={}){
  let response;
  try{const scoped=path.startsWith('/api/v5/')||path.startsWith('/api/farm/records');
    const url=scoped?path+(path.includes('?')?'&':'?')+'farmId='+encodeURIComponent(farm()):path;
    response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}
  catch(_){let e=new Error('Cloud connection unavailable — device edits are still saved locally.');e.code='NETWORK';throw e;}
  let value=await response.json().catch(()=>({}));
  if(!response.ok){let e=new Error(value.error||'The V5 cloud request failed.');e.status=response.status;e.code=value.code;throw e;}
  return value;
 }
 function saveFile(prefix,content){
  const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=prefix+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 function backup(){const records={};for(const k of synced){try{let v=getData(k);if(v!==null)records[k]=v;}catch(_){}}
  saveFile('livestock-v5-device-'+farm()+'-',{app:'Livestock Manager V5 Preview',exportedAt:new Date().toISOString(),account:userId,records,unconfirmed:meta?.pending||false,conflicts:meta?.conflicts||{}});}
 async function cloudBackup(){try{const state=await call('/api/v5/state');const records={livestockAnimals:state.animals.map(row=>({...row.data,id:row.id,photo:row.photo}))};
  for(const d of state.records)records[d.key]=d.data;
  saveFile('livestock-v5-server-'+farm()+'-',{app:'Livestock Manager V5 Preview',exportedAt:new Date().toISOString(),account:userId,records});
 }catch(e){alert('Server backup failed: '+e.message);}}
 function banner(id,text,actions){if(!document.body)return;let old=document.getElementById(id);if(old)old.remove();
  const b=document.createElement('div');b.id=id;b.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;max-width:600px;margin:auto;background:#173b31;color:#fff;z-index:99999;padding:14px;border-radius:12px;box-shadow:0 10px 30px #0007;font:14px/1.5 system-ui';
  const txt=document.createElement('div');txt.textContent=text;b.appendChild(txt);
  for(const [label,fn] of actions){const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='margin:8px 8px 0 0;background:#f4edcf;color:#173b31;border:0;border-radius:6px;padding:8px 10px;cursor:pointer';button.onclick=fn;b.appendChild(button);}
  document.body.appendChild(b);
 }
 function conflict(problem){meta.conflicts={sync:{path:problem.path||'unknown',reason:problem.reason||'Cannot safely merge'}};meta.pending=true;persist();
  report('conflict','V5 sync conflict at '+meta.conflicts.sync.path+'. Changes remain on this device.');
  // Retain the conflict in local sync metadata and refuse unsafe overwrites.
  // Do not cover customer pages with a technical backup dialog.
  document.getElementById('lmV5Conflict')?.remove();
  console.warn('[Livestock Manager] Record merge needs review; conflicting edits were not overwritten.');
 }
 function refreshBanner(){if(!pageReady)return;banner('lmV5NewData','Newer cloud records are available. Reload after saving or closing any open form to see the changes.',
  [['Reload page',()=>{if(formDirty&&!confirm('An open form may have unsaved entries. Reload anyway?'))return;location.reload();}],['Dismiss',()=>document.getElementById('lmV5NewData')?.remove()]]);}
 const stripped=(animal)=>{const data={};for(const [k,v] of Object.entries(animal||{}))if(!['id','farmerId','photo','photoVersion','version','__proto__','constructor','prototype'].includes(k))data[k]=v;return data;};
 function normalizedAnimal(a){return {...stripped(a),id:String(a.id),photo:String(a.photo||'')};}
 function list(){let v=getData('livestockAnimals');return Array.isArray(v)?v.map(normalizedAnimal):[];}
 function baseRow(row){return {data:M.snap(row.data),version:row.version,photo:M.snap(row.photo),photoVersion:row.photoVersion};}
 function storedRow(entry,id){if(!entry)return M.ABSENT;return {...entry.data,id,photo:entry.photo};}
 function serverRow(row){return {...row.data,id:row.id,photo:row.photo||''};}
 function equalList(a,b){return M.eq(a,b);}
 function plan(state){
  const remote=new Map((state.animals||[]).map(r=>[String(r.id),r]));
  const local=new Map();for(const x of list()){
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(x.id)||local.has(x.id))return {error:{path:'livestockAnimals',reason:'Animal IDs must be unique, 1-80 letters/numbers'}};
   local.set(x.id,x);
  }
  const base=new Map(Object.entries(meta.baselines||{}));
  const merged=[];
  for(const id of new Set([...remote.keys(),...local.keys(),...base.keys()])){
   const b=base.has(id)?storedRow(base.get(id),id):M.ABSENT;
   const l=local.has(id)?local.get(id):M.ABSENT;
   const r=remote.has(id)?serverRow(remote.get(id)):M.ABSENT;
   const result=M.merge(b,l,r,'livestockAnimals['+id+']');
   if(!result.ok)return {error:result};
   if(result.value!==M.ABSENT)merged.push(result.value);
  }
  const docs={};
  const remoteDocs=new Map((state.records||[]).filter(r=>DOCS.includes(r.key)).map(r=>[r.key,r]));
  for(const k of DOCS){
   let b=Object.prototype.hasOwnProperty.call(meta.docBaselines,k)?meta.docBaselines[k]:M.ABSENT;
   const l=getData(k);
   const r=remoteDocs.has(k)?remoteDocs.get(k).data:null;
   // When two devices create their first records in an empty category,
   // use that category's actual empty shape as the common baseline.
   if(b===null && l!==null && r!==null && typeof l==='object' && typeof r==='object')
     b=OBJECT_DOCS.has(k)?{}:[];
   const outcome=M.merge(b,l,r,k);if(!outcome.ok)return {error:outcome};
   docs[k]=outcome.value===M.ABSENT?null:outcome.value;
  }
  return {remote,remoteDocs,merged,docs};
 }
 function updateBaseline(state){
  meta.baselines=Object.fromEntries((state.animals||[]).map(row=>[String(row.id),baseRow(row)]));
  meta.docBaselines=Object.fromEntries(DOCS.map(k=>{
   const doc=(state.records||[]).find(r=>r.key===k);return [k,M.snap(doc?doc.data:null)];
  }));
  meta.docVersions=Object.fromEntries(DOCS.map(k=>{const r=(state.records||[]).find(x=>x.key===k);return [k,r?r.version:0];}));
  persist();
 }
 function pendingAgainst(state,planData){
  if(!M.eq(planData.merged,(state.animals||[]).map(serverRow)))return true;
  return DOCS.some(k=>!M.eq(planData.docs[k],planData.remoteDocs.get(k)?.data??null));
 }
 function applyPlan(state,p){
  const before=readRaw(localKey('livestockAnimals'));
  const old=list();let dataChanged=!equalList(old,p.merged);
  if(dataChanged)setData('livestockAnimals',p.merged);
  for(const key of DOCS)if(!M.eq(getData(key),p.docs[key])){setData(key,p.docs[key]);dataChanged=true;}
  updateBaseline(state);
  meta.pending=pendingAgainst(state,p);meta.conflicts={};persist();
  const bannerOld=document.getElementById('lmV5Conflict');if(bannerOld)bannerOld.remove();
  if(dataChanged&&pageReady&&before!==null)refreshBanner();
 }
 function fieldsDiff(from,to){
  const changes={},removed=[];
  for(const k of new Set([...Object.keys(from),...Object.keys(to)])){
   if(!Object.prototype.hasOwnProperty.call(to,k))removed.push(k);
   else if(!M.eq(from[k],to[k]))changes[k]=to[k];
  }
  return {changes,removed};
 }
 async function upload(p){
  // Upload by ANIMAL, never overwrite another animal as part of a list save.
  const wanted=new Map(p.merged.map(a=>[a.id,a]));
  for(const id of new Set([...p.remote.keys(),...wanted.keys()])){
   const cloud=p.remote.get(id),local=wanted.get(id);
   if(cloud&&!local){await call('/api/v5/animals/'+encodeURIComponent(id),{method:'DELETE',body:{expectedVersion:cloud.version}});continue;}
   if(!cloud&&local){
    await call('/api/v5/animals',{method:'POST',body:{id,data:stripped(local)}});
    if(local.photo)await call('/api/v5/animals/'+encodeURIComponent(id)+'/photo',{method:'PUT',body:{photo:local.photo,expectedVersion:0}});
    continue;
   }
   if(!cloud||!local)continue;
   const {changes,removed}=fieldsDiff(cloud.data,stripped(local));
   if(Object.keys(changes).length||removed.length){await call('/api/v5/animals/'+encodeURIComponent(id),{method:'PATCH',body:{expectedVersion:cloud.version,changes,removed}});}
   if(!M.eq(cloud.photo||'',local.photo||''))await call('/api/v5/animals/'+encodeURIComponent(id)+'/photo',{
    method:'PUT',body:{expectedVersion:cloud.photoVersion,photo:local.photo||''}});
  }
  for(const k of DOCS){
   const remote=p.remoteDocs.get(k),desired=p.docs[k];
   if(!M.eq(desired,remote?remote.data:null)){
    await call('/api/farm/records/'+encodeURIComponent(k),{method:'PUT',body:{expectedVersion:remote?remote.version:0,data:desired}});
   }
  }
 }
 async function operate(shouldUpload){
  if(!userId||!meta||busy)return false;
  busy=true;report('syncing',shouldUpload?'Saving individual records to cloud…':'Checking for newer cloud records…');
  try{
   let lastErr;
   for(let attempt=0;attempt<4;attempt++){
    const start=readRaw(localKey('livestockAnimals'));
    const state=await call('/api/v5/state');
    if(state.apiVersion!==5)throw Error('Wrong backend version. Do not use the production API for V5.');
    const p=plan(state);
    if(p.error){conflict(p.error);return false;}
    // If another event writes localStorage while fetching, plan() sees latest
    // data. If the current page has an unsubmitted form, it is never replaced.
    applyPlan(state,p);
    const needUpload=meta.pending;
    if(!needUpload){
     if(start!==readRaw(localKey('livestockAnimals'))&&!M.eq(list(),p.merged)){
      meta.pending=true;persist();schedule();
     }else report('synced','V5 Cloud synced — server confirmed');
     return true;
    }
    if(!shouldUpload){schedule();report('syncing','Cloud changes merged. Waiting to save…');return true;}
    try{
     await upload(p);
     // Confirm server acknowledgement with a fresh GET, never infer success
     // from an empty queue or a stale local version number.
     const confirmed=await call('/api/v5/state');
     const q=plan(confirmed);if(q.error){conflict(q.error);return false;}
     applyPlan(confirmed,q);
     if(meta.pending){schedule();report('syncing','Newer local edits still need saving…');}
     else report('synced','V5 Cloud synced — server confirmed');
     return true;
    }catch(e){lastErr=e;
     if(e.status===409&&attempt<3)continue;
     throw e;
    }
   }
   throw lastErr||new Error('Cloud changed repeatedly. Edits remain on this device.');
  }catch(e){meta.pending=true;persist();report(e.status===401?'error':'error',
   e.status===401?'Session expired. Sign in again without clearing device data.':e.message||'Sync unsuccessful; edits kept locally.');return false;}
  finally{busy=false;}
 }
 function schedule(){if(delay)clearTimeout(delay);delay=setTimeout(()=>{delay=null;operate(true);},600);}
 function scheduleSync(key){if(!meta||!userId||!synced.has(key))return;meta.pending=true;persist();report('syncing','Device change waiting for server confirmation…');if(ready)schedule();}
 async function bootstrap(user){
  userId=String(user.id);ready=false;formDirty=false;pageReady=false;
  if(window.LMFarms)await window.LMFarms.bootstrap(user);
  if(poller)clearInterval(poller);
  meta=loadMeta();const firstStart=!meta;if(!meta)meta=defaultMeta();
  report('syncing','Loading fresh V5 test farm…');
  try{
   const state=await call('/api/v5/state');
   if(state.apiVersion!==5)throw Error('Wrong backend: V5 preview must use a separate Render service.');
   if(firstStart){
    // Intentional CLEAN START: ignore all older browser animal data, never
    // migrate v4 livestockAnimals or its conflict metadata into V5.
    setData('livestockAnimals',(state.animals||[]).map(serverRow));
    for(const key of DOCS){const r=(state.records||[]).find(x=>x.key===key);setData(key,r?r.data:null);}
    updateBaseline(state);meta.pending=false;persist();
   }else{
    const p=plan(state);if(p.error){conflict(p.error);ready=true;return false;}
    applyPlan(state,p);
   }
   ready=true;
   if(meta.pending)await operate(true);
   else report('synced','V5 Cloud synced — server confirmed');
   poller=setInterval(()=>{if(!document.hidden&&!formDirty&&!busy)operate(true);},20000);
   return true;
  }catch(e){ready=true;meta.pending=true;persist();report('error',e.message||'V5 cloud unavailable; local edits are retained.');return false;}
 }
 function refresh(){return operate(true);}
 function onVisible(){if(!document.hidden&&ready&&!formDirty)operate(true);}
 window.addEventListener('online',onVisible);window.addEventListener('focus',onVisible);
 document.addEventListener('visibilitychange',onVisible);
 document.addEventListener('livestock:ready',()=>{pageReady=true;});
 document.addEventListener('input',e=>{if(e.target?.closest?.('form'))formDirty=true;});
 document.addEventListener('change',e=>{if(e.target?.closest?.('form'))formDirty=true;});
 document.addEventListener('submit',()=>{setTimeout(()=>{formDirty=false;},1200);},true);
 window.LivestockCloud={version:'5.0-preview',recordsSync:true,bootstrap,sync:()=>operate(true),refresh,
  scheduleSync,isSyncedKey:k=>synced.has(k),getStatus:()=>status,enabled:()=>true,isConfigured:()=>true,
  downloadBackup:backup,downloadCloudBackup:cloudBackup,getUser:()=>userId,hasSession:()=>!!userId,
  getFarm:()=>null,getSubscription:()=>Promise.resolve(null),getMembership:()=>null,
  signOut:()=>window.LMAuth.logout(),getAccessToken:()=>null};
})();
