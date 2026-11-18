/* Livestock Manager V5.3 Phase 4 — Report Centre, read-only UI. */
document.addEventListener('livestock:ready',function(){
 'use strict';
 const $=id=>document.getElementById(id),calc=window.LMFarmReports,period=$('p4ReportPeriod');if(!calc||!period)return;
 const records=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}};
 const farm=()=>window.LMFarms?.getActive?.()||{id:'main',name:'My Farm'};
 const text=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 function addBar(container,name,value,max){const row=document.createElement('div');row.className='v53p4-bar-row';const label=document.createElement('span');label.textContent=name;const bar=document.createElement('div');bar.className='v53p4-track';const fill=document.createElement('i');fill.style.width=(max?100*value/max:0)+'%';bar.append(fill);const num=document.createElement('strong');num.textContent=value;row.append(label,bar,num);container.append(row);}
 function checklist(container,ok,statement){const row=document.createElement('div');row.className='v53p4-check';const marker=document.createElement('span');marker.className='v53p4-check-icon';marker.textContent=ok?'✓':'!';const text=document.createElement('span');text.textContent=statement;row.append(marker,text);container.append(row);}
 function update(){
  const snap={livestockAnimals:records('livestockAnimals'),soldLivestock:records('soldLivestock'),farmFeedPurchases:records('farmFeedPurchases'),livestockHealthRecords:records('livestockHealthRecords'),farmExpenses:records('farmExpenses')};
  const res=calc.calculate(farm(),snap,period.value);text('p4ReportFarm',farm().name||'My Farm');text('p4ReportSales',calc.money(res.salesIncome));text('p4ReportCosts',calc.money(res.operatingCosts));text('p4ReportResult',res.missingBasis?'Incomplete':calc.money(res.operatingResult));text('p4ReportAnimals',String(res.animalCount));
  const note=$('p4ReportAssessment');note.textContent=res.assessment;note.classList.toggle('is-warning',res.profitable==='negative'||res.profitable==='incomplete');
  const counts=Object.entries(res.animalTypes).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...counts.map(x=>x[1])),bars=$('p4HerdBars');bars.replaceChildren();
  if(!counts.length){const p=document.createElement('p');p.className='v53p4-micro';p.textContent='No active animals recorded yet.';bars.append(p);}
  counts.forEach(([name,n])=>addBar(bars,name,n,max));
  const check=$('p4RecordChecklist');check.replaceChildren();
  checklist(check,res.missingBasis===0,res.missingBasis?res.missingBasis+' sale(s) need confirmed animal costs':'Sold animal cost basis is recorded');
  checklist(check,res.undatedTransactions===0,res.undatedTransactions?res.undatedTransactions+' undated transaction(s) excluded':'Transaction dates available for this period');
  checklist(check,res.missingHerdValue===0,res.missingHerdValue?res.missingHerdValue+' active animal(s) have no estimated value':'Estimated values recorded for the herd');
  checklist(check,false,'Check for unrecorded expenses and duplicate feed/health entries');
  // Original page used healthRecords, while actual treatment editor stores livestockHealthRecords.
  const healthCount=records('livestockHealthRecords').length;const legacyHealth=records('healthRecords').length;
  text('healthRecords',String(healthCount||legacyHealth));
 }
 period.addEventListener('change',update);
 window.addEventListener('storage',e=>{if(!e.key||['livestockAnimals','soldLivestock','farmFeedPurchases','livestockHealthRecords','farmExpenses'].some(k=>e.key.includes(k)))update();});
 window.addEventListener('livestock:sync',e=>{if(e.detail?.state==='synced')update();});
 update();
});
