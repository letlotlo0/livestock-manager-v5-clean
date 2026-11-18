/* V5.2 Farm & Account Centre. No changes to the application-wide design palette. */
document.addEventListener('livestock:ready',function(){
 'use strict';
 const farms=window.LMFarms,calculator=window.LMFarmReports,pdf=window.LMReportPDF;
 const user=window.LivestockCore?.getCurrentUser?.();
 if(!user||!farms||!calculator||!pdf)return;
 const $=id=>document.getElementById(id);
 const cash=calculator.money;
 const docs=['soldLivestock','farmFeedPurchases','livestockHealthRecords','farmExpenses','farmOperations'];
 let snapshots=new Map(),summaries=new Map(),editingFarm=null,loading=false;
 const activeId=()=>farms.getActiveId(),list=()=>farms.list(),selected=()=>farms.getActive(),period=()=>$('reportPeriod').value;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeArray=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch(_){return[];}};
 function localSnapshot(){const out={livestockAnimals:safeArray('livestockAnimals')};for(const k of docs)out[k]=safeArray(k);return out;}
 async function serverSnapshot(farmId){
  const response=await fetch('/api/v5/state?farmId='+encodeURIComponent(farmId),{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Could not load server records for this farm ('+response.status+').');
  const data=await response.json();
  if(data.apiVersion!==5)throw Error('Wrong API version for farm report.');
  const out={livestockAnimals:(data.animals||[]).map(row=>({...row.data,id:row.id,photo:row.photo||''}))};
  for(const row of data.records||[])if(docs.includes(row.key))out[row.key]=row.data;
  return out;
 }
 function profile(){const profiles=safeArray('livestockProfiles');return profiles.find(x=>String(x.id)===String(user.id))||user;}
 function saveProfile(p){const profiles=safeArray('livestockProfiles');const i=profiles.findIndex(x=>String(x.id)===String(user.id));if(i===-1)profiles.push(p);else profiles[i]=p;localStorage.setItem('livestockProfiles',JSON.stringify(profiles));}
 function setText(id,value){const e=$(id);if(e)e.textContent=value;}
 function setError(id,msg){const e=$(id);e.textContent=msg||'';e.hidden=!msg;}
 function updateIdentity(){
  const p=profile(),name=p.fullName||p.name||user.fullName||user.name||'Farmer';
  setText('ownerName',name);setText('ownerEmail',user.email||'');
  setText('memberSince',user.createdAt?'Member since '+new Date(user.createdAt).toLocaleDateString('en-ZA'):'Account verified');
  const pic=$('profilePicture');pic.replaceChildren();
  if(typeof p.image==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(p.image)){
   const img=document.createElement('img');img.src=p.image;img.alt='Your profile photo';pic.append(img);
  }else pic.textContent=name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  setText('activeFarmName',selected()?.name||'My Farm');setText('activeFarmLocation',selected()?.location||selected()?.operation||'Farm workspace');
  setText('sidebarFarm',selected()?.name||'My Farm');setText('sidebarFarmMeta',[selected()?.location,selected()?.operation].filter(Boolean).join(' · ')||'Current workspace');
  setText('farmCount',list().length);
 }
 function assessment(summary){return summary.assessment;}
 function showFarmSummary(){const r=summaries.get(activeId());if(!r)return;
  setText('farmIncome',cash(r.salesIncome));setText('farmCosts',cash(r.operatingCosts));setText('farmProfit',r.missingBasis?'Incomplete':cash(r.operatingResult));
  $('profitAssessment').textContent=assessment(r);$('profitAssessment').classList.toggle('warn',r.profitable==='negative'||r.profitable==='incomplete');
  setText('otherSpend',cash(r.otherExpense));setText('feedHealthSpend',cash(r.feedExpense+r.healthExpense));
  setText('activeInvestment',cash(r.activePurchaseInvestment));setText('herdValue',cash(r.estimatedHerdValue));
  setText('sidebarAnimals',r.animalCount);setText('sidebarSales',cash(r.salesIncome));
 }
 function renderFarmCards(){const el=$('farmList');el.replaceChildren();
  list().forEach(f=>{
   const r=summaries.get(f.id),a=f.id===activeId(),card=document.createElement('article');
   card.className='lm-fc-farm'+(a?' is-active':'');
   card.innerHTML='<span class="lm-fc-farm-icon" aria-hidden="true">♧</span><div><div class="lm-fc-farm-title">'+esc(f.name)+(a?'<span class="lm-fc-pill">Active farm</span>':'')+'</div><p class="lm-fc-farm-meta">'+esc([f.location,f.operation].filter(Boolean).join(' · ')||'Farm location not set')+'</p><div class="lm-fc-farm-result">'+(r?r.animalCount+' animals · '+(r.missingBasis?'Incomplete cost data':cash(r.operatingResult)+' recorded result'):'Loading farm totals…')+'</div></div><div class="lm-fc-farm-actions"></div>';
   const actions=card.querySelector('.lm-fc-farm-actions');
   const edit=document.createElement('button');edit.type='button';edit.className='lm-fc-btn';edit.textContent='Edit';edit.onclick=()=>openFarm(f);actions.append(edit);
   if(!a){const switcher=document.createElement('button');switcher.className='lm-fc-btn lm-fc-primary';switcher.textContent='Open farm';switcher.type='button';switcher.onclick=()=>{try{farms.choose(f.id);}catch(e){alert(e.message);}};actions.append(switcher);}
   el.append(card);
  });
 }
 async function loadSummaries(){if(loading)return;loading=true;
  const fs=list();for(const f of fs){
   try{
    // Current farm includes any device edits. Other farms are read from owned server endpoints.
    const snap=f.id===activeId()?localSnapshot():await serverSnapshot(f.id);
    snapshots.set(f.id,snap);summaries.set(f.id,calculator.calculate(f,snap,period()));
   }catch(e){console.warn('Farm summary:',f.name,e);}
  }
  const rows=Array.from(summaries.values()),sum=calculator.combine(rows);
  setText('animalCount',rows.length===fs.length?sum.animalCount:'—');
  setText('salesTotal',rows.length===fs.length?cash(sum.salesIncome):'—');
  setText('portfolioProfit',rows.length===fs.length?(sum.isComplete?cash(sum.operatingResult):'Incomplete'):'—');
  setText('portfolioProfitNote',rows.length!==fs.length?'Some farm records unavailable':sum.isComplete?'Recorded result · not audited profit':'Missing cost information');
  setText('farmListMessage',rows.length===fs.length?'':'Could not load every farm. Refresh while connected to the cloud.');
  renderFarmCards();showFarmSummary();loading=false;
 }
 function recompute(){setText('salesPeriodLabel',period()==='all'?'All history · before costs':period()==='year'?'This year · before costs':'Last 12 months · before costs');for(const f of list()){const data=snapshots.get(f.id);if(data)summaries.set(f.id,calculator.calculate(f,data,period()));}const rows=Array.from(summaries.values()),sum=calculator.combine(rows);
  setText('portfolioProfit',rows.length===list().length?(sum.isComplete?cash(sum.operatingResult):'Incomplete'):'—');
  setText('portfolioProfitNote',sum.isComplete?'Recorded result · not audited profit':'Missing cost information');
  setText('salesTotal',rows.length===list().length?cash(sum.salesIncome):'—');renderFarmCards();showFarmSummary();}
 function openDialog(id){$(id).showModal();}
 function openFarm(f){editingFarm=f||null;$('farmDialogHeading').textContent=f?'Edit farm':'Add a farm';$('saveFarmBtn').textContent=f?'Save farm':'Create farm';
  $('farmName').value=f?.name||'';$('farmLocation').value=f?.location||'';$('farmOperation').value=f?.operation||'Mixed livestock';$('farmMap').value=f?.mapUrl||'';setError('farmFormError','');openDialog('farmDialog');}
 $('addFarm').onclick=()=>openFarm(null);$('addFarmTop').onclick=()=>openFarm(null);
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 $('farmForm').onsubmit=async e=>{e.preventDefault();const details={name:$('farmName').value.trim(),location:$('farmLocation').value.trim(),operation:$('farmOperation').value,mapUrl:$('farmMap').value.trim()};
  const button=$('saveFarmBtn');button.disabled=true;setError('farmFormError','');
  try{
   const id=editingFarm?.id;
   const result=await farms.request(id?'/'+encodeURIComponent(id):'',id?'PATCH':'POST',details);
   await farms.refresh();$('farmDialog').close();updateIdentity();renderFarmCards();
   if(!id&&confirm('Farm created successfully. Open '+result.farm.name+' now?')){farms.choose(result.farm.id);return;}
   summaries.clear();snapshots.clear();await loadSummaries();
  }catch(err){setError('farmFormError',err.message||'Farm could not be saved.');}
  finally{button.disabled=false;}
 };
 function editAccount(){const p=profile();$('farmerName').value=p.fullName||p.name||user.name||'';$('farmerEmail').value=user.email||'';$('farmerPhone').value=p.phone||'';setError('accountFormError','');openDialog('accountDialog');}
 $('editPersonal').onclick=editAccount;$('editAccountSecondary').onclick=editAccount;
 $('accountForm').onsubmit=async e=>{e.preventDefault();const name=$('farmerName').value.trim();if(name.length<2){setError('accountFormError','Name too short.');return;}
  const btn=e.submitter;if(btn)btn.disabled=true;
  try{
   const updated=await window.LMAuth.request('/profile',{method:'PATCH',body:{name}});
   const p=profile();p.name=updated.user.name;p.fullName=updated.user.fullName;p.phone=$('farmerPhone').value.trim();p.id=user.id;
   saveProfile(p);Object.assign(user,p);updateIdentity();$('accountDialog').close();
  }catch(err){setError('accountFormError',err.message||'Profile could not be saved.');}
  finally{if(btn)btn.disabled=false;}
 };
 $('profileImageInput').onchange=function(){const file=this.files?.[0];if(!file)return;
  if(file.size>6*1024*1024){alert('Choose a profile photo under 6 MB.');return;}
  LivestockCore.fileToDataURL(file,data=>{if(!data)return;const p=profile();p.image=data;p.id=user.id;saveProfile(p);updateIdentity();});
 };
 $('reportPeriod').onchange=recompute;
 function notify(text){setText('reportNotice',text);}
 function pdfName(prefix){return prefix+'-'+new Date().toISOString().slice(0,10)+'.pdf';}
 async function exportPdf(mode){
  const b=$(mode==='portfolio'?'pdfPortfolio':'pdfFarm');b.disabled=true;
  notify('Preparing a server-confirmed PDF…');
  try{
   const query=new URLSearchParams({scope:mode,period:period(),farmId:activeId()});
   const r=await fetch('/api/reports/pdf?'+query.toString(),{credentials:'same-origin',cache:'no-store'});
   if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(data.error||'Could not download this report.');}
   const blob=await r.blob();
   if(blob.type!=='application/pdf'&&blob.size<8)throw Error('Server returned an invalid report.');
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=pdfName(mode==='portfolio'?'livestock-portfolio':'livestock-'+selected().name.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
   notify('Server-confirmed PDF downloaded. Unsynced device edits may not appear; sync first for the latest figures.');
  }catch(err){notify('Report unavailable: '+err.message);}
  finally{b.disabled=false;}
 }
 $('pdfFarm').onclick=()=>exportPdf('farm');$('pdfPortfolio').onclick=()=>exportPdf('portfolio');
 $('deviceBackup').onclick=()=>LivestockCloud.downloadBackup();$('serverBackup').onclick=()=>LivestockCloud.downloadCloudBackup();
 $('logoutButton').onclick=async()=>{if(!confirm('Sign out of Livestock Manager?'))return;try{await LMAuth.logout();}catch(e){LMAuth.forget();}location.href='login.html';};
 window.addEventListener('livestock:sync',e=>{const state=e.detail?.state||'checking';setText('sidebarSync',state==='synced'?'Confirmed':state==='conflict'?'Conflict':state==='error'?'Offline':'Syncing…');});
 const st=LivestockCloud.getStatus();setText('sidebarSync',st?.state==='synced'?'Confirmed':st?.state==='error'?'Offline':'Checking…');
 fetch('/api/billing/status',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(s=>{setText('profilePlan',s?.entitlement?.planName?('Current plan: '+s.entitlement.planName):'Manage your membership');}).catch(()=>setText('profilePlan','Membership status unavailable'));
 updateIdentity();loadSummaries();
});
