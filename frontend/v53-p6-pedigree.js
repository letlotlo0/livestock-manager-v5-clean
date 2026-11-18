/* V5.3 Phase 6: printable ancestry passport from current farm's recorded animal links. */
document.addEventListener('livestock:ready',function(){'use strict';
 const D=window.LMPhase6,$=id=>document.getElementById(id),select=$('p6PedAnimal');let herd=[],current=null;
 function node(label,a,recorded){const state=a?'linked':recorded?'unmatched':'unknown';const display=a?D.label(a):recorded||'Not recorded';const caption=a?(a.animalTag||a.registrationNumber||a.breed||'Linked record'):recorded?'Entered parent — not linked to an animal':'Parent information missing';
  return '<article class="p6-ped-node '+state+'"><small>'+D.esc(label)+'</small><strong>'+D.esc(display)+'</strong><span>'+D.esc(caption)+'</span></article>';}
 function ancestors(subject){const sire=D.findParent(subject.sire,herd),dam=D.findParent(subject.dam,herd),grand=[sire?D.findParent(sire.sire,herd):null,sire?D.findParent(sire.dam,herd):null,dam?D.findParent(dam.sire,herd):null,dam?D.findParent(dam.dam,herd):null];
  const refs=[sire?sire.sire:'',sire?sire.dam:'',dam?dam.sire:'',dam?dam.dam:''];return {sire,dam,grand,refs};
 }
 function render(){herd=D.animals();let chosen=select.value,ids=herd.map(a=>String(a.id));if(!ids.includes(chosen)){let saved=localStorage.getItem('selectedAnimalId');chosen=ids.includes(saved)?saved:'';}
  select.replaceChildren(new Option('Select an animal',''));herd.slice().sort((a,b)=>D.label(a).localeCompare(D.label(b))).forEach(a=>select.add(new Option(D.label(a)+' · '+(a.animalTag||a.id),String(a.id))));if(chosen)select.value=chosen;current=herd.find(a=>String(a.id)===String(select.value))||null;
  $('p6PedFarm').textContent=D.farmName();$('p6PedEmpty').hidden=!!current;$('p6PedContent').hidden=!current;if(!current){$('p6PedCompleteness').textContent='Choose a record';return;}
  D.selectAnimal(current.id);const x=current,anc=ancestors(x),children=D.childrenOf(x,herd),known=[anc.sire,anc.dam,...anc.grand].filter(Boolean).length;
  $('p6PedCompleteness').textContent=known+'/6 ancestor records linked';$('p6PedTitle').textContent=D.label(x);$('p6PedSubtitle').textContent=D.species(x)+' · '+(x.breed||'Breed not recorded')+' · '+D.sex(x);$('p6PedTag').textContent=x.animalTag||x.registrationNumber||String(x.id);
  $('p6PedFacts').innerHTML=D.facts([['Animal',D.label(x)],['Ear tag / ID',x.animalTag||x.tag],['Registration number',x.registrationNumber],['Registration status',x.registrationStatus||'Not recorded'],['Breed',x.breed],['Date of birth',D.date(x.birthDate)],['Sex',D.sex(x)],['Herdbook',x.herdbook||'Not recorded']]);
  const row=(cls,caption,content)=>'<div class="p6-ped-level '+cls+'"><p>'+caption+'</p><div>'+content+'</div></div>';
  const grand=anc.grand.map((g,i)=>node(['Paternal grandfather','Paternal grandmother','Maternal grandfather','Maternal grandmother'][i],g,anc.refs[i])).join('');
  $('p6PedTree').innerHTML=row('p6-ped-grand','GENERATION 3 · GRANDPARENTS',grand)+row('p6-ped-parents','GENERATION 2 · PARENTS',node('Sire / father',anc.sire,x.sire)+node('Dam / mother',anc.dam,x.dam))+row('p6-ped-subject','GENERATION 1 · ANIMAL',node('Selected animal',x,''));
  $('p6PedChildren').innerHTML=children.length?children.map(c=>'<button type="button" data-p6-child="'+D.esc(c.id)+'">'+D.esc(D.label(c))+' <small>'+D.esc(c.animalTag||'No tag')+'</small></button>').join(''):'<p class="p6-muted">No offspring linked to this animal in this farm.</p>';
  $('p6PedChildren').querySelectorAll('[data-p6-child]').forEach(b=>b.onclick=()=>{select.value=b.dataset.p6Child;render();});
 }
 select.addEventListener('change',render);
 $('p6PedPrint').addEventListener('click',()=>{if(!current){alert('Select an animal to print.');return}window.print();});
 window.addEventListener('livestock:sync',e=>{if(e.detail&&e.detail.state==='synced')render();});window.addEventListener('storage',e=>{if(!e.key||/livestockAnimals/.test(e.key))render();});render();
});
