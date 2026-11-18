/* V5.3 Phase 3: read-only, farm-scoped weight trend. No changes to existing records. */
document.addEventListener('livestock:ready', function () {
  'use strict';
  const plot = document.getElementById('p3GrowthPlot');
  const select = document.getElementById('animalFilter');
  const range = document.getElementById('p3GrowthRange');
  const history = document.getElementById('recordsList');
  if (!plot || !select || !range || !history) return;
  const gain = document.getElementById('p3DailyGain');
  const days = document.getElementById('p3TrackedDays');
  const points = document.getElementById('p3TrackedPoints');
  const ns = 'http://www.w3.org/2000/svg';
  function element(name, attrs, parent, txt) {
    const el = document.createElementNS(ns, name);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, String(attrs[k])));
    if (txt !== undefined) el.textContent = txt;
    if (parent) parent.appendChild(el);
    return el;
  }
  function readRecords() {
    try { const a = JSON.parse(localStorage.getItem('growthRecords')); return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }
  function readDate(v) {
    const s = String(v || '').slice(0,10);
    if (!/^\d{4}-\d\d-\d\d$/.test(s)) return null;
    const d = new Date(s+'T00:00:00');
    return Number.isFinite(+d) && d.getFullYear()===Number(s.slice(0,4)) && d.getMonth()+1===Number(s.slice(5,7)) && d.getDate()===Number(s.slice(8,10)) ? d : null;
  }
  const weightText = n => Number(n).toLocaleString('en-ZA',{maximumFractionDigits:1});
  const dateText = d => d.toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'});
  function render() {
    const id = select.value;
    const records = readRecords().filter(r => id && String(r.animalId) === String(id))
      .map(r => ({weight:Number(r.weight), date:readDate(r.date)}))
      .filter(r => Number.isFinite(r.weight) && r.weight > 0 && r.date)
      .sort((a,b) => a.date-b.date);
    points.textContent = String(records.length);
    if (records.length > 1) {
      const first = records[0], last = records[records.length-1];
      const dayCount = Math.round((last.date - first.date)/86400000);
      days.textContent = String(dayCount);
      gain.textContent = dayCount > 0 ? ((last.weight-first.weight)/dayCount).toFixed(2)+' kg/day' : '—';
    } else { gain.textContent = '—'; days.textContent = '—'; }
    let visible = records;
    if (range.value !== 'all') {
      const threshold = new Date(); threshold.setHours(0,0,0,0); threshold.setDate(threshold.getDate()-Number(range.value));
      visible = records.filter(r => r.date >= threshold);
    }
    plot.replaceChildren();
    if (!id) { plot.textContent = 'Select an animal above to see its weight trend.'; return; }
    if (!visible.length) { plot.textContent = 'No dated weight records in this period. Choose All records or add a weigh-in.'; return; }
    const svg = element('svg',{viewBox:'0 0 720 250',role:'img','aria-label':visible.length+' recorded weights between '+dateText(visible[0].date)+' and '+dateText(visible[visible.length-1].date)},plot);
    element('title',{},svg,'Recorded animal weights in kilograms');
    const L=64,R=20,T=22,B=44,W=720-L-R,H=250-T-B;
    const values=visible.map(r=>r.weight), min=Math.min(...values), max=Math.max(...values);
    const spread=Math.max(max-min,1), pad=spread*.2, low=Math.max(0,min-pad), high=max+pad;
    const dMin=+visible[0].date, dMax=+visible[visible.length-1].date;
    const x=r=>L+(dMax===dMin ? W/2 : (+r.date-dMin)/(dMax-dMin)*W);
    const y=r=>T+(high-r.weight)/(high-low)*H;
    [0,1,2,3].forEach(i=>{
      const yy=T+(H/3)*i;
      element('line',{x1:L,y1:yy,x2:L+W,y2:yy,stroke:'var(--v51-line)', 'stroke-width':1},svg);
      element('text',{x:L-9,y:yy+4,'text-anchor':'end',fill:'var(--v51-slate)','font-size':12},svg,weightText(high-(high-low)*i/3));
    });
    element('text',{x:L,y:240,fill:'var(--v51-slate)','font-size':12},svg,dateText(visible[0].date));
    if (dMin!==dMax)element('text',{x:L+W,y:240,'text-anchor':'end',fill:'var(--v51-slate)','font-size':12},svg,dateText(visible[visible.length-1].date));
    if (visible.length>1)element('polyline',{points:visible.map(r=>x(r)+','+y(r)).join(' '),fill:'none',stroke:'var(--v51-olive)','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'},svg);
    visible.forEach(r=>{
      const c=element('circle',{cx:x(r),cy:y(r),r:5,fill:'var(--v51-olive)',stroke:'white','stroke-width':2},svg);
      element('title',{},c,dateText(r.date)+': '+weightText(r.weight)+' kg');
    });
  }
  select.addEventListener('change',render);
  range.addEventListener('change',render);
  // The original page rebuilds its history after additions and deletions.
  const observer=new MutationObserver(render);
  observer.observe(history,{childList:true});
  window.addEventListener('storage',e=>{if(!e.key || /growthRecords|selectedAnimalId/.test(e.key))render();});
  window.addEventListener('livestock:sync',function(){select.dispatchEvent(new Event('change'));});
  render();
});
