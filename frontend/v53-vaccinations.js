/* Livestock Manager V5.3 Phase 2 — vaccine scheduling overlay.
   Existing vaccinations.js retains the record form, saving, searching and deletions. */
(function(){
  'use strict';
  function init(){
    var list=document.getElementById('vaccinationList'),queue=document.getElementById('v53VaxQueue');
    var search=document.getElementById('vaccinationSearch'),status=document.getElementById('vaccinationStatusFilter');
    var caption=document.getElementById('v53VaxResults'),chips=Array.from(document.querySelectorAll('[data-vax-filter]'));
    if(!list||!queue||!search||!status)return;
    var currentUser=window.LivestockCore?.getCurrentUser?.()||null, owner=currentUser&&currentUser.id?String(currentUser.id):'';
    function all(){var a=[];try{a=JSON.parse(localStorage.getItem('livestockVaccinations')||'[]');}catch(_){return []}
      if(!Array.isArray(a))return [];
      return owner?a.filter(function(x){return !x.farmerId||String(x.farmerId)===owner;}):a;
    }
    function today(){var d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
    function datePlus30(t){var d=new Date(t+'T00:00:00');d.setDate(d.getDate()+30);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
    function niceDate(t){return /^\d{4}-\d{2}-\d{2}$/.test(t||'')?new Date(t+'T00:00:00').toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'No date';}
    function syncChips(){chips.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.vaxFilter===status.value));});
      if(caption)caption.textContent=list.querySelectorAll('.vaccination-card').length+' records shown';}
    function setFilter(filter){status.value=filter;status.dispatchEvent(new Event('change',{bubbles:true}));syncChips();}
    chips.forEach(function(b){b.addEventListener('click',function(){setFilter(b.dataset.vaxFilter);});});
    status.addEventListener('change',syncChips);search.addEventListener('input',syncChips);
    function renderQueue(){
      var now=today(),max=datePlus30(now),due=all().filter(function(x){return x.nextDate&&x.nextDate<=max;})
        .sort(function(a,b){return String(a.nextDate).localeCompare(String(b.nextDate));});
      queue.replaceChildren();
      if(!due.length){var e=document.createElement('p');e.className='v53-queue-empty';
        e.textContent='No vaccination follow-ups recorded as overdue or due within 30 days.';queue.appendChild(e);return;}
      due.slice(0,6).forEach(function(x){
        var article=document.createElement('article');article.className='v53-queue-entry';
        var detail=document.createElement('div');detail.className='v53-queue-body';
        var title=document.createElement('strong');title.textContent=(x.animalName||'Unnamed animal')+' · '+(x.vaccinationName||'Vaccination');
        var sub=document.createElement('small');sub.textContent='Due: '+niceDate(x.nextDate);
        detail.append(title,sub);
        var flag=document.createElement('span');flag.className='v53-queue-pill';flag.dataset.kind=x.nextDate<now?'overdue':'soon';
        flag.textContent=flag.dataset.kind==='overdue'?'Overdue':'Due soon';
        var btn=document.createElement('button');btn.type='button';btn.className='v53-queue-action';btn.textContent='Find record';
        btn.addEventListener('click',function(){
          search.value=String(x.vaccinationName||'');setFilter(x.nextDate<now?'overdue':'due30');
          var card=Array.from(list.querySelectorAll('.vaccination-card')).find(function(el){
            return el.querySelector('.delete-vaccination')?.dataset.id===String(x.id);
          });
          if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('v53-highlight-card');setTimeout(function(){card.classList.remove('v53-highlight-card');},1600);}
        });
        article.append(detail,flag,btn);queue.appendChild(article);
      });
      if(due.length>6){var more=document.createElement('p');more.className='v53-queue-more';more.textContent='+'+(due.length-6)+' more due records. Use the filters to view them.';queue.appendChild(more);}
    }
    window.addEventListener('lm53:vaccinations-rendered',function(){renderQueue();syncChips();});
    renderQueue();syncChips();
  }
  document.addEventListener('livestock:ready',init);
})();
