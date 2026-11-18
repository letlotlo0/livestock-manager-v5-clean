/* V5.3 Animal workspace. Presentation only: existing animal CRUD, billing, and farm-cloud APIs are untouched. */
(function(){
 'use strict';
 function init(){
  var body=document.body, drawer=document.getElementById('v53AnimalDrawer'), backdrop=document.getElementById('v53FormBackdrop');
  if(!drawer||!backdrop)return;
  var open=document.getElementById('v53OpenAnimalForm'), close=document.getElementById('v53CloseAnimalForm'), cancel=document.getElementById('cancelEdit');
  var input=document.getElementById('v53AnimalSearch'), species=document.getElementById('v53AnimalSpecies'), sex=document.getElementById('v53AnimalSex'), status=document.getElementById('v53AnimalStatus');
  var active=document.getElementById('v53ActivePanel'), sold=document.getElementById('v53SoldPanel'), aTab=document.getElementById('v53ActiveTab'), sTab=document.getElementById('v53SoldTab');
  var cardBtn=document.getElementById('v53CardView'), compactBtn=document.getElementById('v53CompactView'), list=document.getElementById('animalsList'), count=document.getElementById('v53ResultsCount');
  var lastFocus=null, activeTab='active';
  function openDrawer(){lastFocus=document.activeElement;drawer.removeAttribute('aria-hidden');backdrop.hidden=false;body.classList.add('v53-form-open');close.focus();}
  function closeDrawer(){body.classList.remove('v53-form-open');drawer.setAttribute('aria-hidden','true');backdrop.hidden=true;if(lastFocus&&document.contains(lastFocus))lastFocus.focus();}
  open.addEventListener('click',function(){if(cancel&&cancel.style.display!=='none')cancel.click();openDrawer();});
  close.addEventListener('click',function(){if(cancel&&cancel.style.display!=='none')cancel.click();closeDrawer();});
  backdrop.addEventListener('click',function(){if(cancel&&cancel.style.display!=='none')cancel.click();closeDrawer();});
  if(cancel)cancel.addEventListener('click',closeDrawer);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&body.classList.contains('v53-form-open')){e.preventDefault();if(cancel&&cancel.style.display!=='none')cancel.click();closeDrawer();}});
  window.addEventListener('lm53:animal-edit',openDrawer);
  function refresh(){
   var q=(input.value||'').trim().toLowerCase(), typ=species.value, gender=sex.value, state=status.value;
   var all=Array.from(list.querySelectorAll('.animal-card'));var shown=0;
   all.forEach(function(card){
    var valid=(!q||(card.dataset.v53Search||'').includes(q))&&(!typ||card.dataset.v53Species===typ)&&(!gender||card.dataset.v53Sex===gender)&&(!state||(state==='pregnant'?card.dataset.v53Pregnant==='true':card.dataset.v53Registered==='true'));
    card.hidden=!valid;if(valid)shown++;
   });
   var allCount=all.length;
   var pregnant=document.getElementById('v53Pregnant');if(pregnant)pregnant.textContent=all.filter(function(c){return c.dataset.v53Pregnant==='true';}).length;
   var empty=document.getElementById('emptyState');if(empty)empty.hidden=(allCount>0 && shown===0)||allCount>0;
   var none=document.getElementById('v53NoFilterMatches');if(none)none.hidden=shown!==0||allCount===0;
   var soldCount=document.querySelectorAll('#soldList .sold-card').length;
   count.textContent=activeTab==='active'?shown+' of '+allCount+' animals':soldCount+' sold animals';
  }
  var noMatch=document.createElement('p');noMatch.id='v53NoFilterMatches';noMatch.className='v53-no-matches';noMatch.textContent='No animals match your filters. Try a different search or clear a filter.';noMatch.hidden=true;list.after(noMatch);
  [input,species,sex,status].forEach(function(el){el.addEventListener('input',refresh);el.addEventListener('change',refresh);});
  function setTab(which){
   activeTab=which;var isActive=which==='active';aTab.setAttribute('aria-selected',String(isActive));sTab.setAttribute('aria-selected',String(!isActive));active.hidden=!isActive;sold.hidden=isActive;[input,species,sex,status,cardBtn,compactBtn].forEach(function(el){el.disabled=!isActive;});refresh();
  }
  aTab.addEventListener('click',function(){setTab('active');});sTab.addEventListener('click',function(){setTab('sold');});
  function setMode(compact){list.classList.toggle('v53-compact',compact);cardBtn.setAttribute('aria-pressed',String(!compact));compactBtn.setAttribute('aria-pressed',String(compact));}
  cardBtn.addEventListener('click',function(){setMode(false);});compactBtn.addEventListener('click',function(){setMode(true);});
  window.addEventListener('lm53:animals-rendered',function(){refresh();if(body.classList.contains('v53-form-open')&&document.getElementById('cancelEdit').style.display==='none')closeDrawer();});
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
