/* V5.3 Phase 3: read-only weaning planning queue and record filters. */
document.addEventListener('livestock:ready',function(){
  'use strict';
  const grid=document.getElementById('recordsGrid'), search=document.getElementById('p3WeanSearch');
  const status=document.getElementById('p3WeanStatus'), count=document.getElementById('p3WeanMatchCount');
  const empty=document.getElementById('p3WeanNoMatches'), queue=document.getElementById('p3WeanQueue');
  const due=document.getElementById('p3WeanDueCount');
  if(![grid,search,status,count,empty,queue,due].every(Boolean))return;
  function parse(key){try{const a=JSON.parse(localStorage.getItem(key));return Array.isArray(a)?a:[];}catch(_){return [];}}
  function uid(){return String(window.LivestockCore?.getCurrentUser?.()?.id||'');}
  function records(){const id=uid();return parse('weaningRecords').filter(r=>!id || !r.farmerId || String(r.farmerId)===id).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));}
  function date(v){const s=String(v||'').slice(0,10);if(!/^\d{4}-\d\d-\d\d$/.test(s))return null;const d=new Date(s+'T00:00:00');return Number.isFinite(+d)&&d.getFullYear()===Number(s.slice(0,4))&&d.getMonth()+1===Number(s.slice(5,7))&&d.getDate()===Number(s.slice(8,10))?d:null;}
  function until(d){if(!d)return null;const now=new Date();now.setHours(0,0,0,0);return Math.round((+d - +now)/86400000);}
  const formatDate=d=>d.toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'});
  function render(){
    const items=records(), animals=new Map(parse('livestockAnimals').map(a=>[String(a.id),a]));
    const q=search.value.trim().toLowerCase(), fl=status.value;
    let matches=0;
    items.forEach((r,i)=>{
      const a=animals.get(String(r.animalId))||{};
      const hay=[a.name,a.tag,a.breed,r.animalName,r.animalTag,r.notes,r.status].map(x=>String(x||'')).join(' ').toLowerCase();
      const days=until(date(r.date)), pending=String(r.status||'pending')==='pending';
      const pass=(fl==='all'||fl===r.status||(fl==='overdue'&&pending&&days!==null&&days<0)||(fl==='soon'&&pending&&days!==null&&days>=0&&days<=30))&&(!q||hay.includes(q));
      const card=grid.children[i];if(card)card.hidden=!pass;
      if(pass)matches++;
    });
    count.textContent=matches+' of '+items.length+' records';
    empty.hidden=!(items.length && matches===0);
    const pending=items.filter(r=>String(r.status||'pending')==='pending'&&date(r.date));
    const overdue=pending.filter(r=>until(date(r.date))<0);
    due.textContent=overdue.length ? overdue.length+' past planned date'+(overdue.length===1?'':'s') : 'Nothing overdue';
    queue.replaceChildren();
    const ordered=pending.slice().sort((a,b)=>date(a.date)-date(b.date));
    if(!ordered.length){const p=document.createElement('p');p.className='v53-p3-placeholder';p.textContent='No dated pending weaning records. Add one using the Record button above.';queue.appendChild(p);return;}
    ordered.slice(0,5).forEach(r=>{
      const animal=animals.get(String(r.animalId))||{}, d=date(r.date), diff=until(d);
      const row=document.createElement('div');row.className='v53-p3-plan-item';
      const icon=document.createElement('span');icon.className='v53-p3-plan-icon';icon.textContent='🐾';
      const main=document.createElement('div');main.className='v53-p3-plan-main';
      const name=document.createElement('strong');name.textContent=animal.name||r.animalName||'Animal record';
      const info=document.createElement('span');info.textContent=(animal.tag||r.animalTag||'No tag')+' · '+formatDate(d);
      main.append(name,info);
      const when=document.createElement('span');when.className='v53-p3-plan-when'+(diff<0?' is-overdue':'');
      when.textContent=diff<0 ? Math.abs(diff)+' day'+(Math.abs(diff)===1?'':'s')+' past' : diff===0?'Today':diff+' day'+(diff===1?'':'s')+' ahead';
      row.append(icon,main,when);queue.appendChild(row);
    });
    if(ordered.length>5){const more=document.createElement('p');more.className='v53-p3-footnote';more.textContent=(ordered.length-5)+' more pending records are in the full history below.';queue.appendChild(more);}
  }
  search.addEventListener('input',render);status.addEventListener('change',render);
  const observer=new MutationObserver(render);observer.observe(grid,{childList:true});
  window.addEventListener('storage',e=>{if(!e.key||e.key.includes('weaningRecords'))render();});
  window.addEventListener('livestock:sync',render);
  render();
});
