document.addEventListener("livestock:ready",function(){
 var menu=document.getElementById("menuButton"),nav=document.getElementById("navLinks");if(menu&&nav)menu.onclick=function(){nav.classList.toggle("open");};
 function getAnimals(){try{var a=JSON.parse(localStorage.getItem("livestockAnimals"));return Array.isArray(a)?a:[]}catch(e){return[]}}
 var animals=getAnimals(),select=document.getElementById("animalSelect"),canvas=document.getElementById("treeCanvas"),empty=document.getElementById("treeEmpty"),summary=document.getElementById("treeSummary");
 function esc(v){return LivestockCore.escapeHTML(v==null?"":v)}
 function icon(t){t=String(t||"").toLowerCase();return t.indexOf("cattle")>=0||t==="cow"?"🐄":t.indexOf("goat")>=0?"🐐":t.indexOf("sheep")>=0?"🐑":t.indexOf("pig")>=0?"🐖":"🐾"}
 function key(v){return String(v==null?"":v).trim().toLowerCase()}
 function refs(a){return [a.id,a.animalTag,a.tag,a.registrationNumber,a.name].map(key).filter(Boolean)}
 function safePhoto(v){v=String(v||"");return /^(data:image\/(png|jpeg|gif|webp);base64,|https:\/\/|blob:)/i.test(v)?esc(v):""}
 function find(ref){var k=key(ref);if(!k)return null;return animals.find(function(a){return [a.id,a.animalTag,a.tag,a.registrationNumber].map(key).indexOf(k)!==-1})||animals.find(function(a){return key(a.name)===k})||null}
 animals.forEach(function(a){var o=document.createElement("option");o.value=a.id;o.textContent=(a.name||"Unnamed")+" • "+(a.animalTag||a.id);select.appendChild(o)});
 function node(a,cls){var d=document.createElement("div");d.className="animal-node "+(cls||"");d.innerHTML='<div class="node-head"><div class="node-avatar">'+(safePhoto(a.photo)?'<img src="'+safePhoto(a.photo)+'" alt="">':icon(a.type))+'</div><div><h3>'+esc(a.name||"Unnamed animal")+'</h3><small>'+esc(a.breed||a.type||"Livestock")+'</small></div></div><div class="node-meta"><span class="node-tag">'+esc(a.sex||"Sex not recorded")+'</span><span class="node-tag">ID: '+esc(a.animalTag||a.id)+'</span></div>';return d}
 function render(a){canvas.innerHTML="";if(!a){canvas.appendChild(empty);summary.innerHTML="";return}var sire=find(a.sire),dam=find(a.dam),children=animals.filter(function(x){return (key(x.sire)&&refs(a).indexOf(key(x.sire))!==-1)||(key(x.dam)&&refs(a).indexOf(key(x.dam))!==-1)});
 var grandparents=[];[sire,dam].forEach(function(p){if(p){var gp1=find(p.sire),gp2=find(p.dam);if(gp1)grandparents.push(gp1);if(gp2)grandparents.push(gp2)}});
 var levels=[];if(grandparents.length)levels.push({label:"Grandparents",items:grandparents});if(sire||dam)levels.push({label:"Parents",items:[sire,dam].filter(Boolean)});levels.push({label:"Selected Animal",items:[a]});if(children.length)levels.push({label:"Offspring",items:children});
 levels.forEach(function(lv,i){var row=document.createElement("div");row.className="tree-level";var lab=document.createElement("div");lab.className="generation-label";lab.textContent=lv.label;row.appendChild(lab);lv.items.forEach(function(x){var n=node(x,lv.label==="Selected Animal"?"selected":"parent");row.appendChild(n)});canvas.appendChild(row)});
 summary.innerHTML='<div class="summary-card"><span>SELECTED</span><strong>'+esc(a.name||"Unnamed")+'</strong></div><div class="summary-card"><span>FATHER / SIRE</span><strong>'+esc(sire?sire.name:(a.sire||"Not recorded"))+'</strong></div><div class="summary-card"><span>MOTHER / DAM</span><strong>'+esc(dam?dam.name:(a.dam||"Not recorded"))+'</strong></div><div class="summary-card"><span>OFFSPRING</span><strong>'+children.length+'</strong></div>';
 }
 select.addEventListener("change",function(){var a=animals.find(function(x){return String(x.id)===String(select.value)});if(a){localStorage.setItem("selectedAnimalId",a.id);render(a)}});
 document.getElementById("centerTree").onclick=function(){var a=animals.find(function(x){return String(x.id)===String(select.value)});if(a){render(a);var wrap=document.querySelector(".tree-canvas-wrap");wrap.scrollIntoView({behavior:"smooth",block:"center"});wrap.scrollTo({left:Math.max(0,(wrap.scrollWidth-wrap.clientWidth)/2),behavior:"smooth"})}};
 document.getElementById("clearTree").onclick=function(){select.value="";localStorage.removeItem("selectedAnimalId");render(null)};
 var selected=localStorage.getItem("selectedAnimalId"),initial=animals.find(function(x){return String(x.id)===String(selected)});if(initial){select.value=initial.id;render(initial)}else render(null);
});
