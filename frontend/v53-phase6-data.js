/* Livestock Manager V5.3 Phase 6: read-only presentation utilities.
   Uses the existing per-farm scoped browser records; no new storage schema or API. */
(function(){'use strict';
  function get(key){try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:[]}catch(_){return []}}
  function animals(){return window.LivestockCore&&LivestockCore.getAnimals?LivestockCore.getAnimals():get('livestockAnimals')}
  function norm(v){return String(v==null?'':v).trim().toLowerCase()}
  function esc(v){return window.LivestockCore?LivestockCore.escapeHTML(v):String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function safePhoto(src){let x=String(src||'');return /^(data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/)/i.test(x)?esc(x):''}
  function species(a){let s=norm(a&&(a.type||a.species||a.animalType));if(['cattle','cow','bull'].includes(s))return 'Cattle';if(['goat','goats'].includes(s))return 'Goat';if(['sheep','ewe','ram'].includes(s))return 'Sheep';if(['pig','pigs','sow','boar'].includes(s))return 'Pig';return s?'Other':'Not recorded'}
  function icon(a){return {Cattle:'🐄',Goat:'🐐',Sheep:'🐑',Pig:'🐖'}[species(a)]||'🐾'}
  function sex(a){let s=norm(a&&a.sex);return s==='male'||s==='m'?'Male':s==='female'||s==='f'?'Female':'Not recorded'}
  function pregnant(a){return !!a&&(a.pregnant===true||['pregnant','yes'].includes(norm(a.pregnancy))||norm(a.status)==='pregnant')}
  function date(v){if(!v)return 'Not recorded';let s=String(v).slice(0,10);let d=new Date(s+'T00:00:00');return Number.isNaN(d.valueOf())?'Not recorded':d.toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})}
  function money(v){const n=Number(v);return Number.isFinite(n)?'R'+n.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}):'Not recorded'}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
  function label(a){return a&&(a.name||a.animalTag||a.tag)||'Unnamed animal'}
  function id(a){return a==null?'':String(a.id)}
  function ids(a){return [a.id,a.animalTag,a.tag,a.registrationNumber].map(norm).filter(Boolean)}
  // A textual parent is linked only if it uniquely matches one animal; ambiguous names are left unlinked.
  function findParent(reference,herd){const target=norm(reference);if(!target)return null;
    const self=Array.isArray(herd)?herd:animals();const exact=self.filter(a=>ids(a).includes(target));
    if(exact.length===1)return exact[0];if(exact.length>1)return null;
    const names=self.filter(a=>norm(a.name)===target);return names.length===1?names[0]:null;
  }
  function matchesParent(child,field,parent,herd){let ref=norm(child[field]);return ref&&findParent(ref,herd)===parent}
  function childrenOf(parent,herd){return herd.filter(a=>id(a)!==id(parent)&&(matchesParent(a,'sire',parent,herd)||matchesParent(a,'dam',parent,herd)))}
  // Records with their own animalId must match that exact stable identifier.
  function linkedRecords(key,animal,herd){const list=get(key),target=id(animal);return list.filter(r=>{
    if(r.animalId!==undefined&&r.animalId!==null&&String(r.animalId).trim()!=='')return String(r.animalId)===target;
    // Legacy records with *no* ID can be linked only to a unique animal name.
    const name=norm(r.animalName);return !!name&&norm(animal.name)===name&&herd.filter(a=>norm(a.name)===name).length===1;
  })}
  function farmName(){try{const f=window.LMFarms;if(f){const active=f.getActive&&f.getActive();if(active&&(active.name||active.farmName))return active.name||active.farmName;const farms=f.getFarms&&f.getFarms(),id=f.getActiveId&&f.getActiveId(),match=Array.isArray(farms)&&farms.find(x=>String(x.id)===String(id));if(match)return match.name||'Selected farm'}}catch(_){}return 'Active farm'}
  function selectAnimal(idValue, dest){localStorage.setItem('selectedAnimalId',String(idValue));if(dest)window.location.href=dest}
  function facts(data){return data.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v===undefined||v===null||v===''?'Not recorded':v)+'</dd></div>').join('')}
  function status(a){return pregnant(a)?'Pregnant':'Active'}
  window.LMPhase6={get,animals,norm,esc,safePhoto,species,icon,sex,pregnant,date,money,num,label,id,ids,findParent,childrenOf,linkedRecords,farmName,selectAnimal,facts,status};
})();
