/* Livestock Manager V5.3 Phase 6 — Animal Profile.
   Read-only record aggregates, no mutation except existing delete-animal action. */
document.addEventListener('livestock:ready',function(){'use strict';
 const D=window.LMPhase6,$=id=>document.getElementById(id),select=$('p6AnimalSelect');let current=null,tab='identity',animals=[];
 const tabs=[...document.querySelectorAll('[data-profile-tab]')];
 function set(id,v){$(id).textContent=String(v)}
 function rows(a){return D.facts(a)}
 function selectCurrent(){return animals.find(a=>String(a.id)===String(select.value))||null}
 function records(a){return {weights:D.linkedRecords('growthRecords',a,animals),health:D.linkedRecords('livestockHealthRecords',a,animals),vacc:D.linkedRecords('livestockVaccinations',a,animals),wean:D.linkedRecords('weaningRecords',a,animals),children:D.childrenOf(a,animals)}}
 function ledger(a,rec){const events=[];let append=(date,kind,title,note)=>{if(date)events.push({date:String(date).slice(0,10),kind,title,note});};
  if(a.birthDate)append(a.birthDate,'Born','Birth recorded',a.breed||D.species(a));
  if(a.purchaseDate)append(a.purchaseDate,'Purchase','Purchase date recorded',a.purchasePrice!==undefined?'Recorded purchase price: '+D.money(a.purchasePrice):'Purchase amount not recorded');
  rec.weights.forEach(r=>append(r.date,'Weight',r.weight+' kg',r.notes||'Weight measurement'));
  rec.health.forEach(r=>append(r.date,'Health',r.treatment||'Treatment',r.amount!==undefined?'Treatment recorded: '+D.money(r.amount):'Amount not recorded'));
  rec.vacc.forEach(r=>append(r.vaccinationDate||r.date,'Vaccination',r.vaccinationName||'Vaccine recorded',r.notes||'Vaccination event'));
  rec.wean.forEach(r=>append(r.date,'Weaning','Weaning record',r.weight!=null?r.weight+' kg':'No weight recorded'));
  events.sort((x,y)=>y.date.localeCompare(x.date));return events;
 }
 function renderTimeline(a,r){let ev=ledger(a,r);set('p6EventCount',ev.length+' events');$('p6Timeline').innerHTML=ev.length?ev.slice(0,15).map(e=>'<article class="p6-event"><span class="p6-event-dot" aria-hidden="true"></span><div><small>'+D.esc(e.kind)+' · '+D.esc(D.date(e.date))+'</small><h3>'+D.esc(e.title)+'</h3><p>'+D.esc(e.note||'')+'</p></div></article>').join(''):'<p class="p6-muted">No dated events for this animal yet. Add a weight or care record to begin its timeline.</p>';
 }
 function renderTab(){if(!current){$('p6TabPanel').innerHTML='';return}const a=current,r=records(a),tabNode=$('p6TabPanel');
  let sire=D.findParent(a.sire,animals),dam=D.findParent(a.dam,animals);
  const titleOrRecorded=(ref,record)=>record?D.label(record):ref||'Not recorded';
  const detail=(items)=>'<dl class="p6-detail-grid">'+rows(items)+'</dl>';
  const entry=(title,date,note)=>'<div class="p6-history-row"><div><strong>'+D.esc(title)+'</strong><small>'+D.esc(D.date(date))+'</small></div><p>'+D.esc(note||'')+'</p></div>';
  let html='';
  if(tab==='identity')html=detail([['Species',D.species(a)],['Breed',a.breed],['Sex',D.sex(a)],['Tag / ID',a.animalTag||a.tag],['Date of birth',D.date(a.birthDate)],['Herdbook',a.herdbook],['Registration number',a.registrationNumber],['Registration status',a.registrationStatus||'Not recorded'],['Horn status',a.hornStatus],['Lot',a.lotNumber],['Inspection date',D.date(a.inspectionDate)],['Notes',a.sellerRemarks||a.notes||'Not recorded']]);
  if(tab==='care'){const rowsCare=[...r.health.map(x=>({d:x.date,k:'Treatment: '+(x.treatment||'Recorded'),n:'Amount: '+(x.amount==null?'Not recorded':D.money(x.amount))+' · Next review: '+D.date(x.nextDate)})),...r.vacc.map(x=>({d:x.vaccinationDate||x.date,k:'Vaccination: '+(x.vaccinationName||'Recorded'),n:'Next date: '+D.date(x.nextDate)}))].sort((x,y)=>String(y.d||'').localeCompare(String(x.d||'')));
   html='<p class="p6-field-note">Care entries are linked by animal ID. Farm-wide medicines and feed purchases are not attributed here.</p>'+(rowsCare.length?rowsCare.map(x=>entry(x.k,x.d,x.n)).join(''):'<p class="p6-muted">No treatment or vaccination records linked yet.</p>');}
  if(tab==='growth'){const ordered=r.weights.slice().sort((x,y)=>String(x.date).localeCompare(String(y.date)));html='<p class="p6-field-note">Weight history comes from Growth & Weight. Values are not estimates.</p>'+(ordered.length?ordered.slice().reverse().map(x=>entry(x.weight+' kg',x.date,x.notes||'Weight measurement')).join(''):'<p class="p6-muted">No individual weight records. Open Growth & Weight to start a history.</p>');}
  if(tab==='breeding'){html=detail([['Sire / father',titleOrRecorded(a.sire,sire)],['Dam / mother',titleOrRecorded(a.dam,dam)],['Pregnancy status',D.pregnant(a)?'Pregnant':'Not recorded as pregnant'],['Expected birth',D.date(a.expectedBirthDate)],['Recorded calvings',a.calvings==null?'Not recorded':a.calvings],['Last calving',D.date(a.lastCalvingDate)],['Linked offspring',r.children.length]])+
   '<div class="p6-related"><h3>Linked offspring</h3>'+(r.children.length?r.children.map(x=>'<button type="button" data-p6-child="'+D.esc(x.id)+'">'+D.esc(D.label(x))+' · '+D.esc(x.animalTag||'No tag')+' ↗</button>').join(''):'<p class="p6-muted">No offspring linked through sire or dam fields.</p>')+'</div>'+
   '<div class="p6-calculator"><h3>Expected birth date calculator</h3><p>Planning guide only: calculation does not update records or confirm pregnancy.</p><div><select id="p6CalcSpecies" aria-label="Species"><option value="">Choose species</option><option>Cattle</option><option>Goat</option><option>Sheep</option><option>Pig</option></select><input id="p6CalcDate" type="date" aria-label="Conception date"><button type="button" id="p6Calculate" class="p6-btn p6-primary">Calculate</button></div><p id="p6CalcResult" role="status"></p></div>';
  }
  if(tab==='finance'){const treatmentTotal=r.health.reduce((s,x)=>s+D.num(x.amount),0);html=detail([['Recorded purchase price',a.purchasePrice===undefined?'Not recorded':D.money(a.purchasePrice)],['Purchase date',D.date(a.purchaseDate)],['Estimated animal value',a.estimatedValue===undefined?'Not recorded':D.money(a.estimatedValue)],['Recorded treatments',r.health.length],['Treatment amounts recorded',D.money(treatmentTotal)],['Other animal expense field',a.expenses===undefined?'Not recorded':D.money(a.expenses)]])+'<p class="p6-field-note">These are recorded amounts, not a profit calculation. Treatment totals may already be included in other expense fields. Farm-wide feed, staff and overhead are excluded; figures should not be added together without reconciliation.</p>';}
  tabNode.innerHTML=html;
  tabNode.querySelectorAll('[data-p6-child]').forEach(b=>b.onclick=()=>{select.value=b.dataset.p6Child;D.selectAnimal(select.value);render();window.scrollTo({top:0,behavior:'smooth'});});
  let calc=$('p6Calculate');if(calc){$('p6CalcSpecies').value=D.species(a)==='Not recorded'?'':D.species(a);$('p6CalcDate').value=a.pregnancyStartDate||'';calc.onclick=()=>{let sp=$('p6CalcSpecies').value,day=$('p6CalcDate').value,result=LivestockCore.calculateBirthDate(sp,day);$('p6CalcResult').textContent=result?'Expected birth: '+D.date(result)+' (estimated from '+LivestockCore.getGestationDays(sp)+' days)':'Choose a supported species and conception date.';};}
 }
 function render(){animals=D.animals();let selected=select.value;const ids=animals.map(a=>String(a.id));if(!ids.includes(selected)){selected=ids.includes(localStorage.getItem('selectedAnimalId'))?localStorage.getItem('selectedAnimalId'):'';}
  select.replaceChildren(new Option('Select an animal',''));animals.slice().sort((a,b)=>D.label(a).localeCompare(D.label(b))).forEach(a=>select.add(new Option(D.label(a)+' · '+(a.animalTag||a.id),String(a.id))));
  if(selected)select.value=selected;set('p6AnimalCount',animals.length+' active animal'+(animals.length===1?'':'s'));set('p6Farm',D.farmName());current=selectCurrent();$('p6ProfileEmpty').hidden=!!current;$('p6ProfileContent').hidden=!current;if(!current)return;
  D.selectAnimal(current.id);const a=current,r=records(a),sire=D.findParent(a.sire,animals),dam=D.findParent(a.dam,animals);
  set('p6Name',D.label(a));set('p6Subtitle',D.species(a)+' · '+(a.breed||'Breed not recorded')+' · '+D.sex(a));
  set('p6Tag','Tag: '+(a.animalTag||a.tag||'Not recorded'));set('p6Reg',a.registrationNumber?'Registration: '+a.registrationNumber:(a.registrationStatus||'Registration not recorded'));set('p6Status',D.status(a));
  $('p6Photo').innerHTML=D.safePhoto(a.photo)?'<img src="'+D.safePhoto(a.photo)+'" alt="Photo of '+D.esc(D.label(a))+'">':D.icon(a);
  let latest=r.weights.slice().filter(x=>Number(x.weight)>0).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];
  set('p6Weight',latest?latest.weight+' kg':Number(a.weight)>0?a.weight+' kg':'Not recorded');set('p6GrowthCount',r.weights.length);set('p6CareCount',r.health.length+r.vacc.length);set('p6OffspringCount',r.children.length);
  $('p6Facts').innerHTML=rows([['Tag / ID',a.animalTag||a.tag||'Not recorded'],['Birth date',D.date(a.birthDate)],['Sex',D.sex(a)],['Sire',sire?D.label(sire):a.sire||'Not recorded'],['Dam',dam?D.label(dam):a.dam||'Not recorded'],['Registration',a.registrationNumber||a.registrationStatus||'Not recorded']]);
  renderTimeline(a,r);renderTab();$('p6DeleteWrap').hidden=false;
 }
 tabs.forEach(b=>b.onclick=()=>{tab=b.dataset.profileTab;tabs.forEach(x=>{x.classList.toggle('is-selected',x===b);x.setAttribute('aria-selected',String(x===b));});renderTab();});
 select.addEventListener('change',()=>{if(select.value)D.selectAnimal(select.value);render();});
 $('p6Print').addEventListener('click',()=>{if(current)window.print();});
 $('p6Delete').addEventListener('click',()=>{if(!current)return;const name=D.label(current);if(!window.confirm('Permanently delete '+name+'? Related care and growth entries will not be deleted automatically.'))return;
  LivestockCore.saveAnimals(D.animals().filter(a=>String(a.id)!==String(current.id)));localStorage.removeItem('selectedAnimalId');select.value='';render();if(LivestockCore.showToast)LivestockCore.showToast('Animal removed. Linked history was not automatically deleted.','success');});
 function refresh(){let remembered=current&&current.id;render();if(remembered&&!current&&select.value)select.value='';}
 window.addEventListener('livestock:sync',e=>{if(e.detail&&e.detail.state==='synced')refresh();});window.addEventListener('storage',e=>{if(!e.key||/livestockAnimals|growthRecords|livestockHealthRecords|livestockVaccinations|weaningRecords/.test(e.key))refresh();});
 render();
});
