/* V5.3 Phase 3: feed purchase filters, cost categories and collapsible editor.
   Existing add/edit/delete and cloud write behaviour stays in feeding.js. */
document.addEventListener('livestock:ready', function () {
  'use strict';
  const panel=document.getElementById('feedEntryPanel'), open=document.getElementById('p3OpenFeed');
  const close=document.getElementById('p3CloseFeed'), form=document.getElementById('feedForm');
  const list=document.getElementById('feedList'), history=document.querySelector('.history-card');
  const search=document.getElementById('p3FeedSearch'), period=document.getElementById('p3FeedTime');
  const type=document.getElementById('p3FeedType'), matching=document.getElementById('p3FeedMatching');
  const bars=document.getElementById('p3FeedBreakdown'), noMatches=document.getElementById('p3FeedNoMatches');
  if (![panel,open,close,form,list,history,search,period,type,matching,bars,noMatches].every(Boolean)) return;
  history.after(panel); // Existing records first; the form opens below the history when requested.
  document.body.classList.add('v53-p3-initialised');
  function farmRecords() {
    let a=[];
    try { const raw=JSON.parse(localStorage.getItem('farmFeedPurchases')); if(Array.isArray(raw))a=raw; }catch(_){}
    const u=window.LivestockCore?.getCurrentUser?.(), id=u?.id;
    return a.filter(r=>!id || !r.farmerId || String(r.farmerId)===String(id))
      .sort((x,y)=>new Date(y.purchaseDate||0)-new Date(x.purchaseDate||0));
  }
  function cost(record) {
    const raw=record.amount ?? record.cost ?? record.price ?? record.totalCost ?? record.total ?? 0;
    if(typeof raw === 'number')return Number.isFinite(raw)?raw:0;
    let s=String(raw).replace(/R/gi,'').replace(/\s/g,'');
    if(s.includes(',') && !s.includes('.'))s=s.replace(',','.');else s=s.replace(/,/g,'');
    const n=Number(s.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;
  }
  const money=n=>'R'+n.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  function showEditor(reset) {
    if (reset && typeof window.LMFeedResetEditor==='function') window.LMFeedResetEditor();
    document.body.classList.add('v53-p3-editor-open');
    open.setAttribute('aria-expanded','true');
    if(reset) {
      const date=document.getElementById('purchaseDate');
      if(date && !date.value){const d=new Date();date.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
    }
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    const input=panel.querySelector('#feedType');if(input)input.focus({preventScroll:true});
  }
  function hideEditor(withConfirm) {
    if (withConfirm && form.querySelector('#feedType')?.value && !confirm('Close this purchase form and discard unfinished changes?'))return;
    if(typeof window.LMFeedResetEditor==='function')window.LMFeedResetEditor();
    document.body.classList.remove('v53-p3-editor-open');
    open.setAttribute('aria-expanded','false');
    open.focus({preventScroll:true});
  }
  open.addEventListener('click',()=>showEditor(true));
  close.addEventListener('click',()=>hideEditor(true));
  list.addEventListener('click',e=>{if(e.target.closest('[data-edit]'))showEditor(false);},true);
  form.addEventListener('submit',()=>{setTimeout(()=>{
    // Existing handler resets form after a successful save; do not hide on validation error.
    if(!document.getElementById('feedType')?.value && document.body.classList.contains('v53-p3-editor-open'))hideEditor(false);
  },0);});
  function option(label,value){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
  function update() {
    const records=farmRecords(), existing=type.value;
    const feedTypes=[...new Set(records.map(r=>String(r.feedType||'Uncategorised')).filter(Boolean))].sort();
    type.replaceChildren(option('All types','all'));
    feedTypes.forEach(v=>type.appendChild(option(v,v)));
    type.value=feedTypes.includes(existing)?existing:'all';
    const today=new Date(), ym=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
    let shown=[];
    records.forEach((r,i)=>{
      const s=search.value.trim().toLowerCase();
      const hay=[r.feedType,r.feedName,r.supplier,r.notes,r.unit].map(x=>String(x||'')).join(' ').toLowerCase();
      const d=String(r.purchaseDate||'').slice(0,10), dateOk=period.value==='all'||(period.value==='month'&&d.startsWith(ym))||(period.value==='year'&&d.startsWith(String(today.getFullYear())));
      const match=(!s||hay.includes(s))&&dateOk&&(type.value==='all'||String(r.feedType||'Uncategorised')===type.value);
      if(match)shown.push(r);
      const card=list.children[i];if(card)card.hidden=!match;
    });
    matching.textContent=shown.length+' of '+records.length+' purchases';
    noMatches.hidden=!(records.length && !shown.length);
    // Group expenses by the actual feed type rather than inventing consumption estimates.
    const totals=new Map();shown.forEach(r=>{const name=String(r.feedType||'Uncategorised');totals.set(name,(totals.get(name)||0)+cost(r));});
    bars.replaceChildren();
    const items=[...totals.entries()].sort((a,b)=>b[1]-a[1]);
    if(!items.length){const p=document.createElement('p');p.className='v53-p3-placeholder';p.textContent=records.length?'No purchases in this selection.':'No feed purchases recorded yet.';bars.appendChild(p);return;}
    const max=Math.max(...items.map(x=>x[1]),1);
    items.forEach(([name,value])=>{
      const row=document.createElement('div');row.className='v53-p3-spending-row';
      const text=document.createElement('span');text.textContent=name;
      const track=document.createElement('div');track.className='v53-p3-spending-track';
      const fill=document.createElement('span');fill.className='v53-p3-spending-fill';fill.style.width=(value/max*100)+'%';track.appendChild(fill);
      const amount=document.createElement('strong');amount.textContent=money(value);
      row.append(text,track,amount);bars.appendChild(row);
    });
  }
  [search,period,type].forEach(e=>e.addEventListener(e===search?'input':'change',update));
  const observer=new MutationObserver(update);observer.observe(list,{childList:true});
  window.addEventListener('livestock:sync',update);
  window.addEventListener('storage',e=>{if(!e.key || e.key.includes('farmFeedPurchases'))update();});
  update();
});
