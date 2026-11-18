/* V5.3 Phase 5: farm-specific priority inbox, existing email/browser alert controls preserved. */
(function(){
 'use strict';
 function init(){
  if(!document.getElementById('alertWorkspace')||!window.LivestockCore)return;
  var $=id=>document.getElementById(id),esc=v=>LivestockCore.escapeHTML(v==null?'':v);
  var current='all';var farm=window.LMFarms?.getActive?.();$('alertsFarm').textContent='Farm: '+(farm?.name||'Current farm');
  function get(key){try{var x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[];}catch(e){return[];}}
  function days(iso){return LivestockCore.daysUntil(iso);}
  function fmt(iso){if(!iso)return'No due date';var d=new Date(String(iso).slice(0,10)+'T00:00:00');return isNaN(d)?'Not scheduled':d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});}
  function categorize(item){
    var kind=String(item.kind||'Record');
    if(kind==='Health'&&/vaccin/i.test(String(item.title||'')+' '+String(item.text||'')))kind='Vaccination';
    return ['Pregnancy','Health','Vaccination','Weaning','Operation','Growth','Record','Finance'].includes(kind)?kind:'Record';
  }
  function action(kind){return {Pregnancy:'birth-records.html',Health:'health.html',Vaccination:'vaccinations.html',Weaning:'weaning.html',Operation:'operations.html',Growth:'growth.html',Record:'animals.html',Finance:'money-stats.html'}[kind]||'animals.html';}
  function collect(){
    var items=LivestockCore.getFarmIntelligence().map((a,i)=>{
      var kind=categorize(a);
      // Missing tags, stale weight history and financial suggestions do not have actual due dates.
      // Do not mislabel those advisory records as overdue scheduled tasks.
      var advisory=['Record','Growth','Finance'].includes(kind);
      return {id:'int-'+i,kind,title:String(a.title||'Reminder'),text:String(a.text||''),date:advisory?'':(a.date||''),priority:a.priority||'low'};
    });
    get('farmOperations').forEach((task,i)=>{
      var status=String(task.status||'').toLowerCase().trim();
      if(status==='completed'||status==='done')return;
      var date=task.date||'',d=days(date);
      // Unscheduled operations are review items, not manufactured overdue reminders.
      items.push({id:'op-'+(task.id||i),kind:'Operation',title:task.category||'Farm operation',text:[task.area,task.details].filter(Boolean).join(' · ')||'Review farm task',date,
        priority:status==='needs attention'||(d!==null&&d<0)?'high':d!==null&&d<=7?'medium':'low'});
    });
    items.sort((a,b)=>{
      var weight=x=>{var d=days(x.date);return d!==null&&d<0?0:d===0?1:d!==null&&d<=7?2:x.priority==='high'?3:4;};
      return weight(a)-weight(b)||String(a.date||'9999').localeCompare(String(b.date||'9999'));
    });return items;
  }
  function classOf(item){var d=days(item.date);if(d!==null&&d<0)return'overdue';if(d===0)return'today';if(d!==null&&d>=1&&d<=7)return'upcoming';return'later';}
  function badgeOf(item){var d=days(item.date);return d===null?'Review':d<0?Math.abs(d)+' day(s) late':d===0?'Today':d<=7?'In '+d+' day(s)':'Scheduled';}
  function render(){
    var alerts=collect();$('allCount').textContent=alerts.length;
    $('overdueCount').textContent=alerts.filter(a=>classOf(a)==='overdue').length;
    $('todayCount').textContent=alerts.filter(a=>classOf(a)==='today').length;
    $('weekCount').textContent=alerts.filter(a=>{var d=days(a.date);return d!==null&&d>=0&&d<=7;}).length;
    var term=String($('alertsSearch').value||'').trim().toLowerCase(),cat=$('alertsCategory').value;
    var shown=alerts.filter(a=>(current==='all'||classOf(a)===current||(current==='upcoming'&&classOf(a)==='today'))&&(cat==='all'||a.kind===cat)&&(!term||[a.title,a.kind,a.text].some(x=>x.toLowerCase().includes(term))));
    $('alertsMatches').textContent=shown.length+' visible';$('alertsList').replaceChildren();
    if(!shown.length){$('alertsList').innerHTML='<div class="v53p5-empty"><strong>Nothing in this view</strong><p>There are no matching reminders. Clear your filters or add dates to your farm records.</p></div>';return;}
    shown.forEach(a=>{
      var kind=a.kind,style=classOf(a),icons={Pregnancy:'🐣',Health:'🩺',Vaccination:'💉',Weaning:'🍼',Operation:'📋',Growth:'⚖️',Record:'🪪',Finance:'💰'};
      var el=document.createElement('article');el.className='v53p5-record';
      el.innerHTML='<div class="v53p5-record-icon">'+(icons[kind]||'🔔')+'</div><div class="v53p5-record-main"><span class="v53p5-kicker">'+esc(kind)+'</span><h3>'+esc(a.title)+'</h3><p>'+esc(a.text)+'</p></div><div class="v53p5-record-end"><strong>'+esc(fmt(a.date))+'</strong><span class="v53p5-status'+(style==='overdue'?' is-late':'')+'">'+esc(badgeOf(a))+'</span></div>';
      var link=document.createElement('a');link.href=action(kind);link.textContent='Open workspace ↗';link.className='v53p5-inline-link';el.appendChild(link);
      $('alertsList').appendChild(el);
    });
  }
  document.querySelectorAll('[data-alert-tab]').forEach(button=>button.addEventListener('click',()=>{
    current=button.dataset.alertTab;document.querySelectorAll('[data-alert-tab]').forEach(x=>x.classList.toggle('is-active',x===button));render();
  }));
  $('alertsSearch').addEventListener('input',render);$('alertsCategory').addEventListener('change',render);
  function notificationStatus(){
    var status=$('notificationStatus'),button=$('notificationButton');
    if(!('Notification' in window)){status.textContent='Browser notifications are not available on this device.';button.disabled=true;return;}
    var p=Notification.permission;
    status.textContent=p==='granted'?'Browser notifications are allowed.':p==='denied'?'Notifications are blocked in browser settings.':'Allow notifications to receive supported browser reminders.';
    button.textContent=p==='granted'?'Notifications enabled':p==='denied'?'Blocked in settings':'Enable notifications';button.disabled=p!=='default';
  }
  $('notificationButton').addEventListener('click',()=>{
    if(!('Notification' in window))return;
    LivestockCore.requestNotifications();setTimeout(notificationStatus,400);
  });
  notificationStatus();render();
 }
 document.addEventListener('livestock:ready',init,{once:true});
})();
