/* V5.3 family tree studio. Uses existing parent IDs/tags/names and same current-farm records. */
(function(){
 'use strict';
 function init(){
  var canvas=document.getElementById('treeCanvas'),select=document.getElementById('animalSelect'),inspector=document.getElementById('v53TreeInspector');
  if(!canvas||!select||!inspector)return;
  var zoom=1;
  function readAnimals(){try{var data=JSON.parse(localStorage.getItem('livestockAnimals')||'[]');return Array.isArray(data)?data:[]}catch(e){return[];}}
  function normalize(v){return String(v==null?'':v).trim().toLowerCase();}
  function matches(ref,animal){return ref&&[animal.id,animal.animalTag,animal.tag,animal.registrationNumber,animal.name].some(function(r){return normalize(r)===normalize(ref);});}
  function writeInspector(){
   var animals=readAnimals(),a=animals.find(function(item){return String(item.id)===String(select.value);});
   inspector.replaceChildren();
   function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;inspector.appendChild(e);return e;}
   el('span','v53-eyebrow','ANIMAL DETAILS');
   if(!a){el('h2',null,'Explore your herd');el('p',null,'Select an animal to view its parents, offspring and registration details.');var link=el('a',null,'Manage animal records');link.href='animals.html';return;}
   el('h2',null,a.name||'Unnamed animal');el('p',null,(a.breed||a.type||'Livestock')+' · '+(a.sex||'Sex not recorded'));
   var dl=el('dl','v53-inspector-stats');
   [['Animal tag',a.animalTag||a.tag||'Not recorded'],['Registration',a.registrationNumber||a.registrationStatus||'Not recorded'],['Sire / father',a.sire||'Not recorded'],['Dam / mother',a.dam||'Not recorded'],['Offspring on this farm',String(animals.filter(function(k){return matches(k.sire,a)||matches(k.dam,a);}).length)]].forEach(function(k){var d=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k[0];dd.textContent=k[1];d.append(dt,dd);dl.appendChild(d);});
   var link=el('a','v53-inspector-link','Open full animal profile ↗');link.href='animal-profile.html';link.addEventListener('click',function(){localStorage.setItem('selectedAnimalId',String(a.id));});
  }
  function draw(){
   var previous=canvas.querySelector('.v53-tree-connectors');if(previous)previous.remove();
   var nodes=Array.from(canvas.querySelectorAll('.animal-node[data-v53-animal-id]'));writeInspector();if(!nodes.length)return;
   var animals=readAnimals();var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('v53-tree-connectors');svg.setAttribute('aria-hidden','true');svg.setAttribute('width','100%');svg.setAttribute('height','100%');canvas.prepend(svg);
   var box=canvas.getBoundingClientRect(),w=canvas.offsetWidth,h=canvas.offsetHeight;svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('preserveAspectRatio','none');
   function idInfo(node){return animals.find(function(a){return String(a.id)===node.dataset.v53AnimalId;});}
   function center(node,isParent){var r=node.getBoundingClientRect(),mult=zoom;return {x:(r.left-box.left+r.width/2)/mult,y:(isParent?r.bottom-box.top:r.top-box.top)/mult};}
   var rows=Array.from(canvas.querySelectorAll('.tree-level'));
   for(var i=0;i<rows.length-1;i++){
    var parents=Array.from(rows[i].querySelectorAll('.animal-node'));
    var children=Array.from(rows[i+1].querySelectorAll('.animal-node'));
    children.forEach(function(child){var c=idInfo(child);if(!c)return;parents.forEach(function(parent){var a=idInfo(parent);if(!a||!(matches(c.sire,a)||matches(c.dam,a)))return;
     var p1=center(parent,true),p2=center(child,false),mid=(p1.y+p2.y)/2;
     var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M '+p1.x+' '+p1.y+' V '+mid+' H '+p2.x+' V '+p2.y);path.setAttribute('fill','none');path.setAttribute('stroke','var(--v51-olive)');path.setAttribute('stroke-width','2.5');path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');path.setAttribute('opacity','0.55');svg.appendChild(path);
    });});
   }
   nodes.forEach(function(node){node.addEventListener('click',function(){select.value=node.dataset.v53AnimalId;select.dispatchEvent(new Event('change',{bubbles:true}));});node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();node.click();}});});
  }
  function applyZoom(){canvas.style.zoom=String(Math.round(zoom*100))+'%';document.getElementById('v53ZoomLabel').textContent=Math.round(zoom*100)+'%';draw();}
  document.getElementById('v53ZoomIn').addEventListener('click',function(){zoom=Math.min(1.5,+(zoom+0.1).toFixed(2));applyZoom();});
  document.getElementById('v53ZoomOut').addEventListener('click',function(){zoom=Math.max(0.7,+(zoom-0.1).toFixed(2));applyZoom();});
  document.getElementById('v53PrintTree').addEventListener('click',function(){if(!select.value){alert('Select an animal before printing its family tree.');return;}window.print();});
  window.addEventListener('lm53:tree-rendered',draw);
  window.addEventListener('resize',draw);
  draw();
 }
 document.addEventListener('livestock:ready',init,{once:true});
})();
