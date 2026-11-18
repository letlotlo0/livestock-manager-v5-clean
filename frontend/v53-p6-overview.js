/* V5.3 Phase 6: searchable farm-specific herd overview. No records are modified. */
document.addEventListener('livestock:ready',function(){'use strict';
 const D=window.LMPhase6,$=id=>document.getElementById(id),filters=['p6Search','p6Species','p6Sex','p6Status'];let herd=[];
 function set(id,text){$(id).textContent=String(text)}
 function render(){herd=D.animals();const term=D.norm($('p6Search').value),sp=$('p6Species').value,sex=$('p6Sex').value,status=$('p6Status').value;
  set('p6OverviewFarm',D.farmName());set('p6Total',herd.length);set('p6Females',herd.filter(a=>D.sex(a)==='Female').length);set('p6Pregnant',herd.filter(D.pregnant).length);set('p6Sold',D.get('soldLivestock').length);
  const groups=['Cattle','Goat','Sheep','Pig','Other'];const counts=groups.map(name=>({name,count:herd.filter(a=>D.species(a)===(name==='Other'?'Other':name)||name==='Other'&&D.species(a)==='Not recorded').length}));const max=Math.max(1,...counts.map(x=>x.count));
  $('p6SpeciesBars').innerHTML=counts.map(x=>'<div class="p6-species-row"><span>'+D.esc(x.name)+'</span><div class="p6-bar-track"><i style="width:'+Math.round(x.count/max*100)+'%"></i></div><strong>'+x.count+'</strong></div>').join('');
  const untagged=herd.filter(a=>!String(a.animalTag||a.tag||'').trim()).length,unsexed=herd.filter(a=>D.sex(a)==='Not recorded').length,unparented=herd.filter(a=>!String(a.sire||'').trim()||!String(a.dam||'').trim()).length;
  $('p6Quality').innerHTML=[['Animals without a tag',untagged],['Animals without recorded sex',unsexed],['Animals with incomplete parentage',unparented]].map(x=>'<div><span>'+D.esc(x[0])+'</span><strong>'+x[1]+'</strong></div>').join('');
  const matches=herd.filter(a=>{const searchable=[a.name,a.animalTag,a.tag,a.breed,a.registrationNumber,a.type].map(D.norm).join(' ');return (!term||searchable.includes(term))&&(!sp||D.species(a)===sp)&&(!sex||D.sex(a)===sex)&&(!status||(status==='pregnant'?D.pregnant(a):!(a.animalTag||a.tag)))}).sort((a,b)=>D.label(a).localeCompare(D.label(b)));
  set('p6Results',matches.length+' of '+herd.length+' animals');
  $('p6RosterList').innerHTML=matches.length?matches.map(a=>'<article class="p6-roster-item"><div class="p6-roster-animal"><span class="p6-roster-icon">'+(D.safePhoto(a.photo)?'<img src="'+D.safePhoto(a.photo)+'" alt="">':D.icon(a))+'</span><div><strong>'+D.esc(D.label(a))+'</strong><small>'+D.esc(a.animalTag||a.tag||'Tag not recorded')+'</small></div></div><div class="p6-roster-detail"><strong>'+D.esc(a.breed||D.species(a))+'</strong><small>'+D.esc(D.species(a)+' · '+D.sex(a))+'</small></div><div><span class="p6-pill">'+D.esc(D.status(a))+'</span></div><button type="button" data-p6-id="'+D.esc(a.id)+'" class="p6-btn p6-outline">View profile ↗</button></article>').join(''):'<div class="p6-empty-inline">No animals match these filters. Try a different search or visit Animals to add your first animal.</div>';
  $('p6RosterList').querySelectorAll('[data-p6-id]').forEach(b=>b.addEventListener('click',()=>D.selectAnimal(b.dataset.p6Id,'animal-profile.html')));
 }
 filters.forEach(id=>{$(id).addEventListener('input',render);$(id).addEventListener('change',render);});
 window.addEventListener('livestock:sync',e=>{if(e.detail&&e.detail.state==='synced')render();});window.addEventListener('storage',e=>{if(!e.key||/livestockAnimals|soldLivestock/.test(e.key))render();});render();
});
