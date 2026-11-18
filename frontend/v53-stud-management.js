/* Livestock Manager V5.3 Phase 5 — Stud Management.
 * Mating journal is stored as studServices on the sire's existing animal record;
 * it therefore follows the established per-animal cloud merge and farm scope. */
(function(){
 'use strict';
 function init(){
  if(!document.getElementById('studWorkspace')||!window.LivestockCore)return;
  var $=id=>document.getElementById(id),esc=v=>LivestockCore.escapeHTML(v==null?'':v);
  var get=()=>LivestockCore.getAnimals(),today=()=>LivestockCore.getToday();
  var farm=window.LMFarms?.getActive?.();$('studFarm').textContent='Farm: '+(farm?.name||'Current farm');
  var selected='';var drawer=$('studDrawer'),overlay=$('studOverlay'),button=$('studAddService'),form=$('studForm');
  function key(v){return String(v==null?'':v).trim().toLowerCase();}
  function sex(a,kind){return kind==='male'?/^(male|m|bull|ram|buck|boar)$/i.test(String(a.sex||'').trim()):/^(female|f|cow|ewe|doe|sow)$/i.test(String(a.sex||'').trim());}
  function sp(a){return a.type||a.species||'';}
  function males(){return get().filter(a=>sex(a,'male'));}
  function services(a){return Array.isArray(a.studServices)?a.studServices:[];}
  function refs(a){return [a.id,a.animalTag,a.tag,a.name,a.registrationNumber].map(key).filter(Boolean);}
  function isOffspring(child,a){return refs(a).includes(key(child.sire));}
  function name(a){return a.name||a.animalTag||a.tag||'Unnamed sire';}
  function date(s){if(!s)return'Not recorded';var d=new Date(s+'T00:00:00');return isNaN(d)?'Not recorded':d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});}
  function setupForm(){
    var sireSelect=$('studMale'),female=$('studFemale'),pastSire=sireSelect.value;
    sireSelect.replaceChildren();var p=document.createElement('option');p.value='';p.textContent='Select sire';sireSelect.appendChild(p);
    males().forEach(a=>{var opt=document.createElement('option');opt.value=String(a.id);opt.textContent=name(a)+' · '+(a.animalTag||a.id);sireSelect.appendChild(opt);});
    sireSelect.value=selected||pastSire;
    function fillFemales(){
      var si=get().find(a=>String(a.id)===sireSelect.value),prior=female.value;female.replaceChildren();
      var blank=document.createElement('option');blank.value='';blank.textContent='Not recorded';female.appendChild(blank);
      get().filter(a=>sex(a,'female')&&(!si||sp(a)===sp(si))).forEach(a=>{var o=document.createElement('option');o.value=String(a.id);o.textContent=name(a)+' · '+(a.animalTag||a.id);female.appendChild(o);});
      if(Array.from(female.options).some(o=>o.value===prior))female.value=prior;
    }
    sireSelect.onchange=fillFemales;fillFemales();$('studDate').value=today();
  }
  function open(){if(window.LivestockCloud?.getStatus?.().state==='conflict'){alert('Please resolve the cloud conflict before recording a mating.');return;}
    if(!males().length){alert('Register at least one male animal in Animals first.');return;}
    setupForm();overlay.hidden=false;drawer.classList.add('is-open');drawer.setAttribute('aria-hidden','false');document.body.classList.add('v53p5-modal-open');$('studMale').focus();}
  function close(){overlay.hidden=true;drawer.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');document.body.classList.remove('v53p5-modal-open');button.focus();}
  button.addEventListener('click',open);$('studClose').addEventListener('click',close);$('studCancel').addEventListener('click',close);overlay.addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('is-open'))close();});
  function render(){
    var herd=get(),sires=males();
    if(selected&&!sires.some(a=>String(a.id)===selected))selected='';
    if(!selected&&sires.length)selected=String(sires[0].id);
    var foals=sires.reduce((sum,si)=>sum+herd.filter(a=>isOffspring(a,si)).length,0);
    var mating=sires.reduce((sum,si)=>sum+services(si).length,0);
    $('studTotal').textContent=sires.length;$('studYoung').textContent=foals;$('studServices').textContent=mating;
    $('studRegistered').textContent=sires.filter(a=>a.registrationStatus==='Registered'||!!a.registrationNumber).length;
    var term=key($('studSearch').value),type=$('studSpecies').value;
    var filtered=sires.filter(a=>(type==='all'||sp(a)===type)&&(!term||[a.name,a.animalTag,a.tag,a.breed,a.registrationNumber,sp(a)].some(x=>key(x).includes(term))));
    $('studCount').textContent=filtered.length+' sire(s)';$('studList').replaceChildren();
    if(!filtered.length){$('studList').innerHTML='<div class="v53p5-empty"><strong>No breeding males found</strong><p>Register a male animal or clear your search filters.</p></div>';}
    filtered.forEach(a=>{
      var offspring=herd.filter(x=>isOffspring(x,a)).length;
      var b=document.createElement('button');b.type='button';b.className='v53p5-stud-card'+(String(a.id)===selected?' is-selected':'');b.setAttribute('aria-pressed',String(a.id)===selected?'true':'false');
      b.innerHTML='<span class="v53p5-stud-avatar">'+({'Cattle':'🐂','Goat':'🐐','Sheep':'🐏','Pig':'🐖'}[sp(a)]||'🐾')+'</span><span class="v53p5-stud-copy"><strong>'+esc(name(a))+'</strong><small>'+esc(sp(a)||'Livestock')+' · '+esc(a.breed||'Breed unrecorded')+' · '+esc(a.animalTag||a.id)+'</small><span>'+offspring+' linked offspring · '+services(a).length+' services</span></span><span class="v53p5-stud-arrow">›</span>';
      b.addEventListener('click',()=>{selected=String(a.id);render();});$('studList').appendChild(b);
    });
    var sire=sires.find(a=>String(a.id)===selected),ins=$('studInspector');
    if(!sire){ins.innerHTML='<span class="v53p5-kicker">SIRE DETAILS</span><h2>Choose a breeding male</h2><p>Its profile and offspring will appear here.</p>';}else{
      var young=herd.filter(a=>isOffspring(a,sire));
      ins.innerHTML='<span class="v53p5-kicker">SIRE DETAILS</span><h2>'+esc(name(sire))+'</h2><p>'+esc(sire.breed||sp(sire)||'Livestock')+' · '+esc(sire.animalTag||sire.id)+'</p><dl class="v53p5-dl"><div><dt>Registration</dt><dd>'+esc(sire.registrationNumber||sire.registrationStatus||'Not recorded')+'</dd></div><div><dt>Current weight</dt><dd>'+esc(sire.weight||'Not recorded')+(sire.weight?' kg':'')+'</dd></div><div><dt>Recorded offspring</dt><dd>'+young.length+'</dd></div><div><dt>Services logged</dt><dd>'+services(sire).length+'</dd></div></dl><h3>Linked offspring</h3><div id="studOffspring" class="v53p5-linked"></div><div class="v53p5-link-list"><a href="animal-profile.html" id="studAnimalLink">Open full animal profile ↗</a><a href="family-tree.html" id="studFamilyLink">Explore this family tree ↗</a></div>';
      var ol=$('studOffspring');if(!young.length){ol.textContent='No offspring linked yet. Set this sire on newborn records in Birth Centre or Animals.';}else young.slice(0,8).forEach(x=>{var a=document.createElement('span');a.textContent=(x.name||x.animalTag||'Newborn')+' · '+(x.animalTag||'No tag');ol.appendChild(a);});
      ['studAnimalLink','studFamilyLink'].forEach(id=>$(id).addEventListener('click',()=>localStorage.setItem('selectedAnimalId',String(sire.id))));
    }
    var logs=[];sires.forEach(si=>services(si).forEach(log=>logs.push({si,log})));logs.sort((a,b)=>String(b.log.date).localeCompare(String(a.log.date)));
    $('studHistoryCount').textContent=logs.length+' records';$('studHistory').replaceChildren();
    if(!logs.length)$('studHistory').innerHTML='<div class="v53p5-empty"><strong>No mating records yet</strong><p>Record a service to begin tracking breeding activity.</p></div>';
    logs.slice(0,80).forEach(({si,log})=>{var r=document.createElement('article');r.className='v53p5-record';
      r.innerHTML='<div class="v53p5-record-icon">🐂</div><div class="v53p5-record-main"><h3>'+esc(name(si))+'</h3><p>'+esc(log.method||'Breeding service')+' · '+esc(log.damName||log.dam||'Dam not recorded')+'</p><small>'+esc(log.notes||'No observations')+'</small></div><div class="v53p5-record-end"><strong>'+esc(date(log.date))+'</strong><span class="v53p5-status">Logged</span></div>';
      $('studHistory').appendChild(r);});
  }
  $('studSearch').addEventListener('input',render);$('studSpecies').addEventListener('change',render);
  form.addEventListener('submit',function(e){e.preventDefault();if(!form.reportValidity())return;
    var all=get(),sire=all.find(a=>String(a.id)===$('studMale').value),dam=all.find(a=>String(a.id)===$('studFemale').value),day=$('studDate').value;
    if(!sire||!sex(sire,'male')){alert('Select a breeding male from this farm.');return;}
    if(dam&&(!sex(dam,'female')||sp(dam)!==sp(sire))){alert('The dam must be a female of the same species.');return;}
    if(day>today()){alert('A completed mating date cannot be in the future.');return;}
    if(services(sire).length>=200){alert('This sire has reached 200 journal entries. Please export a backup before adding more.');return;}
    var log={id:'srv_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),date:day,method:$('studMethod').value,
      dam:dam?String(dam.animalTag||dam.tag||dam.id):'',damName:dam?name(dam):'',notes:$('studNotes').value.trim()};
    sire.studServices=[...services(sire),log];
    try{LivestockCore.saveAnimals(all);}catch(err){alert('Could not save service: '+err.message);return;}
    selected=String(sire.id);form.reset();close();render();LivestockCore.showToast('Mating saved to sire record. Pregnancy not automatically assumed.','success');
  });
  render();
 }
 document.addEventListener('livestock:ready',init,{once:true});
})();
