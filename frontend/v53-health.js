/* Livestock Manager V5.3 Phase 2 — treatment workspace only.
   Retains original health.js data keys, save/delete/edit handlers and farm-scoped cloud storage. */
(function () {
  'use strict';
  function ready() {
    var body=document.body, drawer=document.getElementById('v53HealthDrawer'),backdrop=document.getElementById('v53HealthBackdrop');
    var openBtn=document.getElementById('v53OpenHealth'),closeBtn=document.getElementById('v53CloseHealth');
    var form=document.getElementById('healthForm'), treatment=document.getElementById('treatment');
    var list=document.getElementById('recordsList'),search=document.getElementById('v53HealthSearch');
    var status=document.getElementById('v53HealthStatus'),noMatch=document.getElementById('v53HealthNoMatch');
    var results=document.getElementById('v53HealthResults'),queue=document.getElementById('v53HealthQueue');
    var count=document.getElementById('v53HealthDueCount'), heading=document.getElementById('v53HealthFormHeading');
    if(!drawer||!backdrop||!form||!list||!search||!status||!queue)return;
    var lastTrigger=null,dirty=false,working=false;
    var currentUser=window.LivestockCore?.getCurrentUser?.()||null;
    var owner=currentUser&&currentUser.id?String(currentUser.id):'';
    function getRecords(){
      var items=[];try{items=JSON.parse(localStorage.getItem('livestockHealthRecords')||'[]');}catch(_){return []}
      if(!Array.isArray(items))return [];
      return owner?items.filter(function(x){return !x.farmerId||String(x.farmerId)===owner;}):items;
    }
    function todayKey(){var d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
    function plusDays(key,days){var d=new Date(key+'T00:00:00');d.setDate(d.getDate()+days);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
    function displayDate(key){if(!/^\d{4}-\d{2}-\d{2}$/.test(key||''))return 'No date';return new Date(key+'T00:00:00').toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});}
    function category(x,now,limit){if(!x.nextDate)return 'none';if(x.nextDate<now)return 'overdue';if(x.nextDate<=limit)return 'soon';return 'scheduled';}
    function openDrawer(mode,source){
      lastTrigger=source||document.activeElement;
      if(mode!=='edit')document.dispatchEvent(new Event('lm53:health-reset-edit'));
      heading.textContent=mode==='edit'?'Edit Health Record':'Record Treatment';
      drawer.hidden=false;backdrop.hidden=false;body.classList.add('v53-health-drawer-open');
      dirty=false;
      if(mode==='edit')setTimeout(function(){document.getElementById('treatment')?.focus();},0);
      else setTimeout(function(){document.getElementById('animal')?.focus();},0);
    }
    function closeDrawer(saved){
      if(!saved&&dirty&&!confirm('Discard unsaved treatment changes?'))return;
      document.dispatchEvent(new Event('lm53:health-reset-edit'));
      drawer.hidden=true;backdrop.hidden=true;body.classList.remove('v53-health-drawer-open');
      dirty=false;if(lastTrigger&&typeof lastTrigger.focus==='function')lastTrigger.focus();
    }
    openBtn.addEventListener('click',function(){openDrawer('new',openBtn);});
    closeBtn.addEventListener('click',function(){closeDrawer(false);});
    backdrop.addEventListener('click',function(){closeDrawer(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!drawer.hidden)closeDrawer(false);});
    form.addEventListener('input',function(){dirty=true;});
    form.addEventListener('change',function(){dirty=true;});
    // The original health.js saves and resets the form synchronously on successful submit.
    form.addEventListener('submit',function(){setTimeout(function(){if(!treatment.value.trim()&&!drawer.hidden)closeDrawer(true);},0);});
    list.addEventListener('click',function(e){var edit=e.target.closest('[data-edit]');if(edit){openDrawer('edit',edit);dirty=false;}});
    function refresh(){
      if(working)return;working=true;
      try{
        var records=getRecords(),map=new Map(records.map(function(x){return [String(x.id),x];}));
        var now=todayKey(),limit=plusDays(now,30),q=search.value.trim().toLowerCase(),filter=status.value;
        var cards=Array.from(list.querySelectorAll('.record-card')),shown=0;
        cards.forEach(function(card){
          var button=card.querySelector('[data-edit]'),x=button?map.get(String(button.dataset.edit)):null;
          var kind=x?category(x,now,limit):'none';
          var match=(!q||card.textContent.toLowerCase().includes(q))&&(filter==='all'||kind===filter);
          card.hidden=!match;if(match)shown++;
          var place=card.querySelector('.record-top');
          if(place){var chip=place.querySelector('.v53-record-chip');
            if(!chip){chip=document.createElement('span');chip.className='v53-record-chip';place.appendChild(chip);}
            chip.dataset.kind=kind;
            chip.textContent={overdue:'Overdue',soon:'Due soon',scheduled:'Scheduled',none:'No follow-up'}[kind];
          }
        });
        var hasRecords=cards.length>0;
        if(noMatch)noMatch.hidden=!hasRecords||shown>0;
        // Original emptyState handles zero saved treatments, not search mismatches.
        results.textContent=hasRecords?shown+' of '+cards.length+' treatment records':'';
        var due=records.filter(function(x){return ['overdue','soon'].includes(category(x,now,limit));})
          .sort(function(a,b){return String(a.nextDate).localeCompare(String(b.nextDate));});
        count.textContent=due.length;
        queue.replaceChildren();
        if(!due.length){
          var msg=document.createElement('p');msg.className='v53-queue-empty';
          msg.textContent='No recorded treatments are overdue or due within 30 days.';queue.appendChild(msg);
        }else{
          due.slice(0,5).forEach(function(x){
            var box=document.createElement('article');box.className='v53-queue-entry';
            var text=document.createElement('div');text.className='v53-queue-body';
            var title=document.createElement('strong');title.textContent=(x.animalName||'Unnamed animal')+' · '+(x.treatment||'Treatment');
            var sub=document.createElement('small');sub.textContent=displayDate(x.nextDate);
            var flag=document.createElement('span');flag.className='v53-queue-pill';
            flag.dataset.kind=category(x,now,limit);flag.textContent=flag.dataset.kind==='overdue'?'Overdue':'Due soon';
            text.append(title,sub);
            var action=document.createElement('button');action.type='button';action.className='v53-queue-action';action.textContent='Review';
            action.addEventListener('click',function(){
              search.value='';status.value='all';refresh();
              var target=Array.from(list.querySelectorAll('[data-edit]')).find(function(b){return b.dataset.edit===String(x.id);});
              if(target)target.click();
            });
            box.append(text,flag,action);queue.appendChild(box);
          });
          if(due.length>5){var more=document.createElement('p');more.className='v53-queue-more';more.textContent='+'+(due.length-5)+' more follow-up records. Use the Overdue or Due soon filters below.';queue.appendChild(more);}
        }
      }finally{working=false;}
    }
    search.addEventListener('input',refresh);status.addEventListener('change',refresh);
    // Health.js rebuilds the record cards after save/edit/remove; don't alter those handlers.
    var pending=false;
    var observer=new MutationObserver(function(mutations){
      if(!mutations.some(function(m){return m.target===list&&m.type==='childList';})||pending)return;
      pending=true;queueMicrotask(function(){pending=false;refresh();});
    });
    observer.observe(list,{childList:true});
    refresh();
  }
  document.addEventListener('livestock:ready',ready);
})();
