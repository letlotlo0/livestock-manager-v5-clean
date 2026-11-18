/* Server-authorized farm selection. A user always has a 'main' farm.
   Farm isolation uses separate device/cloud stores, not UI-only filtering. */
(function () {
  'use strict';
  let owner='',farms=[],active='main',loaded=false;
  const idKey=id=>'lm_v52_active_farm_'+id;
  async function request(path,method='GET',body){
    const response=await fetch('/api/farms'+path,{method,credentials:'same-origin',cache:'no-store',
      headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Farm request unsuccessful');
    return data;
  }
  async function bootstrap(user){
    owner=String(user.id);
    const result=await request('');
    farms=result.farms||[];
    const saved=localStorage.getItem(idKey(owner));
    active=farms.some(f=>f.id===saved)?saved:(farms[0]?.id||'main');
    localStorage.setItem(idKey(owner),active);
    loaded=true;
    updateLabels();
    return farms;
  }
  function updateLabels(){
    const farm=farms.find(f=>f.id===active);
    if(!farm)return;
    document.querySelectorAll('.lm-farm-identity strong').forEach(el=>el.textContent=farm.name);
    // The chip is deliberately subtle; no existing design colours are changed.
    const nav=document.querySelector('.lm-account-shortcut');
    if(nav){nav.title='Active farm: '+farm.name+' · Manage farms in profile';
      const caption=nav.querySelector('.lm-account-label small');
      if(caption)caption.textContent=farm.name.length>24?farm.name.slice(0,21)+'…':farm.name;
    }
  }
  function choose(id){
    if(!farms.some(f=>f.id===id))throw new Error('Farm not in your account');
    if(id===active)return;
    const state=window.LivestockCloud?.getStatus?.();
    if(state?.state==='syncing'||state?.state==='conflict'||state?.state==='error'){
      if(!confirm('Some edits may not be confirmed by the cloud yet. They are saved on this device. Switch farms anyway?'))return;
    }
    localStorage.setItem(idKey(owner),id);location.reload();
  }
  function fileFarm(id){return farms.find(f=>f.id===id)||null;}
  window.LMFarms={bootstrap,request,choose,getActiveId:()=>active,getActive:()=>fileFarm(active),
    list:()=>farms.slice(),getOwner:()=>owner,loaded:()=>loaded,refresh:async()=>{
      const result=await request('');farms=result.farms||[];updateLabels();return farms;
    },updateLabels};
  document.addEventListener('livestock:ready',updateLabels);
})();
