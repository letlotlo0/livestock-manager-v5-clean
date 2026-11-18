/* Livestock Manager V5.3 Phase 5 — Birth & Calving Centre.
 * Reuses V5 cloud-synced livestockAnimals; no new local-only collections. */
(function () {
  'use strict';
  function init() {
    var root=document.getElementById('birthWorkspace');
    if(!root || !window.LivestockCore) return;
    var $=id=>document.getElementById(id);
    var esc=v=>LivestockCore.escapeHTML(v==null?'':v);
    var today=()=>LivestockCore.getToday();
    var animals=()=>LivestockCore.getAnimals();
    var countDays=v=>LivestockCore.daysUntil(v);
    var farm=window.LMFarms?.getActive?.();
    $('birthFarm').textContent='Farm: '+(farm?.name||'Current farm');
    var active='registered';
    var overlay=$('birthOverlay'),drawer=$('birthDrawer'),form=$('birthForm'),open=$('birthOpen');
    function openForm() {
      if (window.LivestockCloud?.getStatus?.().state==='conflict') { alert('A cloud conflict needs to be resolved before adding an animal. Your current data has not been changed.'); return; }
      fillParents(); $('birthDate').value=today();
      overlay.hidden=false;drawer.classList.add('is-open');drawer.setAttribute('aria-hidden','false');
      document.body.classList.add('v53p5-modal-open');open.setAttribute('aria-expanded','true');
      $('birthName').focus();
    }
    function closeForm() {
      overlay.hidden=true;drawer.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');
      document.body.classList.remove('v53p5-modal-open');open.setAttribute('aria-expanded','false');open.focus();
    }
    open.addEventListener('click',openForm);
    $('birthClose').addEventListener('click',closeForm);
    $('birthCancel').addEventListener('click',closeForm);
    overlay.addEventListener('click',closeForm);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('is-open'))closeForm();});
    function key(v){return String(v==null?'':v).trim().toLowerCase();}
    function species(a){return String(a.type||a.species||'');}
    function isFemale(a){return /^(female|f|cow|ewe|doe|sow)$/i.test(String(a.sex||'').trim());}
    function isMale(a){return /^(male|m|bull|ram|buck|boar)$/i.test(String(a.sex||'').trim());}
    function label(a){return (a.name||a.animalTag||a.tag||'Animal')+' · '+(a.animalTag||a.tag||a.id);}
    function insertOptions(select,rows){
      var chosen=select.value;select.replaceChildren();
      var blank=document.createElement('option');blank.value='';blank.textContent='Unknown / not recorded';select.appendChild(blank);
      rows.forEach(a=>{var option=document.createElement('option');option.value=String(a.id);option.textContent=label(a);select.appendChild(option);});
      if(rows.some(a=>String(a.id)===chosen))select.value=chosen;
    }
    function fillParents(){
      var typ=$('birthType').value;var entries=animals().filter(a=>!typ||species(a)===typ);
      insertOptions($('birthDam'),entries.filter(isFemale));insertOptions($('birthSire'),entries.filter(isMale));
    }
    $('birthType').addEventListener('change',fillParents);
    function safeDate(iso){if(!iso)return'Not recorded';var d=new Date(iso+'T00:00:00');return isNaN(d)?'Not recorded':d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});}
    function isPregnant(a){return a.pregnant===true||key(a.pregnancy)==='pregnant';}
    function ref(a){return String(a.animalTag||a.tag||a.id);}
    function matches(refText,animal){var k=key(refText);return k&&[animal.id,animal.animalTag,animal.tag,animal.name,animal.registrationNumber].some(x=>key(x)===k);}
    function parentName(value,herd){var a=herd.find(a=>matches(value,a));return a?(a.name||a.animalTag||a.id):(value||'Not recorded');}
    function birthRows(herd){return herd.filter(a=>a.birthDate||a.dateOfBirth).sort((a,b)=>String(b.birthDate||b.dateOfBirth).localeCompare(String(a.birthDate||a.dateOfBirth)));}
    function upcoming(herd){return herd.filter(a=>isPregnant(a)&&a.expectedBirthDate&&countDays(a.expectedBirthDate)!==null).sort((a,b)=>String(a.expectedBirthDate).localeCompare(String(b.expectedBirthDate)));}
    function render(){
      var herd=animals(),born=birthRows(herd),waiting=upcoming(herd),recent=born.filter(a=>{var d=countDays(a.birthDate||a.dateOfBirth);return d!==null&&d<=0&&d>=-30;});
      $('birthTotal').textContent=born.length;
      $('birthRecent').textContent=recent.length;
      $('birthDue').textContent=waiting.filter(a=>{var d=countDays(a.expectedBirthDate);return d>=0&&d<=30;}).length;
      $('birthOverdue').textContent=waiting.filter(a=>countDays(a.expectedBirthDate)<0).length;
      var term=key($('birthSearch').value),type=$('birthSpecies').value;
      var matched=(active==='registered'?born:waiting).filter(a=>(type==='all'||species(a)===type)&&(!term||[a.name,a.animalTag,a.tag,a.breed,a.dam,a.sire,a.registrationNumber].some(x=>key(x).includes(term))));
      $('birthMatches').textContent=matched.length+' '+(active==='registered'?'birth record(s)':'expected birth(s)');
      $('birthList').replaceChildren();
      if(!matched.length){$('birthList').innerHTML='<div class="v53p5-empty"><strong>No matching records</strong><p>'+(active==='registered'?'Registered animals with recorded birth dates will appear here.':'Pregnant animals with expected birth dates will appear here.')+'</p></div>';return;}
      matched.forEach(a=>{
        var item=document.createElement('article');item.className='v53p5-record';
        var date=active==='registered'?(a.birthDate||a.dateOfBirth):a.expectedBirthDate;
        var days=countDays(date),pill=active==='registered'?'Recorded birth':days<0?'Past expected date':days===0?'Expected today':'Due in '+days+'d';
        var detail=active==='registered'?'Dam: '+parentName(a.dam,herd)+' · Sire: '+parentName(a.sire,herd):'Expected birth for '+(a.name||a.animalTag||'animal');
        item.innerHTML='<div class="v53p5-record-icon">'+({'Cattle':'🐄','Goat':'🐐','Sheep':'🐑','Pig':'🐖'}[species(a)]||'🐾')+'</div><div class="v53p5-record-main"><h3>'+esc(a.name||a.animalTag||'Unnamed animal')+'</h3><p>'+esc(species(a)||'Livestock')+' · '+esc(a.animalTag||a.tag||'Tag pending')+'</p><small>'+esc(detail)+'</small></div><div class="v53p5-record-end"><strong>'+esc(safeDate(date))+'</strong><span class="v53p5-status'+(days<0&&active==='expected'?' is-late':'')+'">'+esc(pill)+'</span></div>';
        var action=document.createElement('a');action.href='animal-profile.html';action.className='v53p5-inline-link';action.textContent='Open animal ↗';action.addEventListener('click',()=>localStorage.setItem('selectedAnimalId',String(a.id)));item.appendChild(action);
        $('birthList').appendChild(item);
      });
    }
    Array.from(document.querySelectorAll('[data-birth-tab]')).forEach(b=>b.addEventListener('click',()=>{active=b.dataset.birthTab;document.querySelectorAll('[data-birth-tab]').forEach(n=>n.classList.toggle('is-active',n===b));render();}));
    $('birthSearch').addEventListener('input',render);$('birthSpecies').addEventListener('change',render);
    function makeId(){
      var part=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,14):Math.random().toString(36).slice(2,14);
      return 'born_'+Date.now().toString(36)+'_'+part;
    }
    function submit(e){
      e.preventDefault();
      if(!form.reportValidity())return;
      var herd=animals();var typ=$('birthType').value,sex=$('birthSex').value,date=$('birthDate').value,tag=$('birthTag').value.trim();
      var name=$('birthName').value.trim()||(typ==='Cattle'?'Newborn calf':typ==='Goat'?'Newborn kid':typ==='Sheep'?'Newborn lamb':'Newborn piglet');
      if(date>today()){alert('Actual birth dates cannot be in the future. Use expected births for upcoming deliveries.');return;}
      if(tag&&herd.some(a=>key(a.animalTag||a.tag)===key(tag))){alert('That ear tag is already assigned to an animal on this farm.');return;}
      var dam=herd.find(a=>String(a.id)===$('birthDam').value);
      var sire=herd.find(a=>String(a.id)===$('birthSire').value);
      if(dam&&(species(dam)!==typ||!isFemale(dam))){alert('The mother must be a female of the same species.');return;}
      if(sire&&(species(sire)!==typ||!isMale(sire))){alert('The father must be a male of the same species.');return;}
      if(window.LivestockSubscription && !LivestockSubscription.canAddAnimal()){alert('Your subscription has reached its animal limit. Upgrade to register another animal.');return;}
      var weight=$('birthWeight').value.trim(),num=weight?Number(weight):null;
      if(weight&&(!Number.isFinite(num)||num<0)){alert('Please enter a valid birth weight.');return;}
      var id=makeId();while(herd.some(a=>String(a.id)===id))id=makeId();
      var newborn={id,name,animalTag:tag,type:typ,sex,breed:'',birthDate:date,birthWeight:num,weight:num,
        dam:dam?ref(dam):'',sire:sire?ref(sire):'',pregnant:false,pregnancy:'Not pregnant',registrationStatus:'Not registered',
        status:'active',purchasePrice:null,notes:$('birthNotes').value.trim(),birthRecordSource:'v53-birth-centre',
        farmerId:LivestockCore.getCurrentUser()?.id||null};
      herd.push(newborn);
      if(dam){
        // Multiple offspring on the same day represent one calving, not one calving per baby.
        var sameDay=String(dam.lastCalvingDate||'')===date;
        var last=String(dam.lastCalvingDate||'');
        dam.offspring=(Number(dam.offspring)||0)+1;
        if(!sameDay)dam.calvings=(Number(dam.calvings)||0)+1;
        if(!last||last<=date)dam.lastCalvingDate=date;
        // Do not clear a newer pregnancy when entering a historical birth.
        if(isPregnant(dam)&&(!dam.pregnancyStartDate||date>=dam.pregnancyStartDate)){
          dam.pregnant=false;dam.pregnancy='Not pregnant';dam.expectedBirthDate='';dam.pregnancyStartDate='';
        }
      }
      try{LivestockCore.saveAnimals(herd);}catch(err){alert('Could not save this birth: '+err.message);return;}
      form.reset();closeForm();render();LivestockCore.showToast('Newborn registered in '+(farm?.name||'this farm')+'. Confirm cloud sync before switching farms.','success');
    }
    form.addEventListener('submit',submit);
    render();
  }
  document.addEventListener('livestock:ready',init,{once:true});
})();
