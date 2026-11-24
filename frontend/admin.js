'use strict';
(()=>{
 const $=id=>document.getElementById(id);let page=1,hasMore=false;
 const show=(id,visible)=>{$(id).hidden=!visible;};
 const formatDate=v=>v?new Date(v).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'}):'—';
 const formatMoney=v=>'R'+Number(v||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
 const api=async(path,options={})=>{
  const res=await fetch('/api/admin'+path,{credentials:'same-origin',cache:'no-store',...options});
  let data={};try{data=await res.json()}catch{}if(!res.ok)throw Error(data.error||`Request failed (${res.status}).`);return data;
 };
 const td=(row,value)=>{const cell=document.createElement('td');cell.textContent=value===null||value===undefined?'—':String(value);row.appendChild(cell);return cell;};
 const renderRows=(id,rows,cols)=>{const body=$(id);body.replaceChildren();if(!rows.length){const tr=document.createElement('tr');const cell=td(tr,'No records found.');cell.colSpan=cols.length;body.appendChild(tr);return;}rows.forEach(item=>{const tr=document.createElement('tr');cols.forEach(fn=>td(tr,fn(item)));body.appendChild(tr);});};
 function metric(label,value){const box=document.createElement('div');box.className='metric';const a=document.createElement('span'),b=document.createElement('b');a.textContent=label;b.textContent=String(value);box.append(a,b);return box;}
 async function overview(){const data=await api('/overview');const s=data.summary,root=$('metrics');root.replaceChildren(
  metric('Registered users',s.users),metric('Verified emails',s.verified_users),metric('Active paid subscriptions',s.active_subscriptions),metric('Verified payments this month',formatMoney(s.verified_payments_this_month)),
  metric('Registered farms',s.farms),metric('Animal records',s.animals),metric('Pending checkouts',s.pending_payments),metric('Database',data.database));
  $('status').textContent=`Billing enforcement: ${data.billingEnforced?'ON':'OFF'} · Test mode: ${data.testMode?'ON':'OFF'} · Updated ${new Date().toLocaleTimeString('en-ZA')}`;
 }
 async function users(){const query=encodeURIComponent($('search').value.trim());const data=await api(`/users?page=${page}&q=${query}`);hasMore=data.hasMore;
  renderRows('userRows',data.users,[u=>`${u.full_name} (${u.email})`,u=>u.verified?'Yes':'No',u=>`${u.plan} · ${u.subscription_status}`,u=>u.farm_count,u=>u.animal_count,u=>formatDate(u.created_at)]);
  $('pageText').textContent=`Page ${page}`;$('prev').disabled=page<=1;$('next').disabled=!hasMore;}
 async function payments(){const data=await api('/payments');renderRows('paymentRows',data.payments,[p=>p.email,p=>p.plan,p=>formatMoney(p.amount),p=>p.status,p=>formatDate(p.created_at)]);renderRows('eventRows',data.verifiedNotifications,[e=>e.email,e=>e.payment_status,e=>formatMoney(e.amount_gross),e=>formatDate(e.created_at)]);}
 async function audit(){const data=await api('/audit');renderRows('auditRows',data.events,[e=>e.actor_email,e=>e.action,e=>formatDate(e.created_at)]);}
 const switchTab=async(name)=>{document.querySelectorAll('.tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-selected',String(b.dataset.tab===name));});['users','payments','audit'].forEach(t=>show(t+'Panel',t===name));await ({users,payments,audit})[name]();};
 async function openWorkspace(){show('unlockSection',false);show('workspace',true);show('lock',true);await overview();await switchTab('users');}
 function lockScreen(msg){show('unlockSection',true);show('workspace',false);show('lock',false);$('unlockStatus').textContent=msg||'';}
 $('unlockForm').addEventListener('submit',async e=>{e.preventDefault();$('unlockStatus').textContent='Verifying…';try{await api('/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('code').value})});$('code').value='';await openWorkspace();}catch(err){$('unlockStatus').textContent=err.message;}});
 $('lock').addEventListener('click',async()=>{try{await api('/lock',{method:'POST'})}catch{}lockScreen('Administrator access locked.');});
 $('refresh').addEventListener('click',async()=>{try{await overview();await switchTab(document.querySelector('.tabs .active').dataset.tab)}catch(err){lockScreen(err.message);}});
 $('searchForm').addEventListener('submit',e=>{e.preventDefault();page=1;users().catch(err=>{$('status').textContent=err.message;});});
 $('prev').addEventListener('click',()=>{if(page>1){page--;users().catch(()=>{});}});
 $('next').addEventListener('click',()=>{if(hasMore){page++;users().catch(()=>{});}});
 document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab).catch(err=>{$('status').textContent=err.message;})));
 api('/session').then(s=>s.elevated?openWorkspace():lockScreen('')).catch(err=>lockScreen(err.message));
})();
