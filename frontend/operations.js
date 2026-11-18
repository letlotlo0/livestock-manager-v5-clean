/* Livestock Manager V5.3 Phase 4 — editable, cloud-backed farm operations board.
 * Existing farmOperations record schema retained (additional fields optional). */
document.addEventListener('livestock:ready',function(){
 'use strict';
 const $=id=>document.getElementById(id),form=$('opsForm'),list=$('opsList'),editor=$('opsEditor');if(!form||!list||!editor)return;
 const d=$('opDate'),cat=$('opCategory'),area=$('opArea'),status=$('opStatus'),notes=$('opDetails'),search=$('p4OpsSearch'),filterCategory=$('p4OpsCategory');
 const today=()=>{const now=new Date();return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');};
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=()=>{try{const data=JSON.parse(localStorage.getItem('farmOperations')||'[]');return Array.isArray(data)?data:[];}catch(_){return[];}};
 const save=data=>localStorage.setItem('farmOperations',JSON.stringify(data));
 const farm=()=>window.LMFarms?.getActive?.()?.name||'My Farm';
 let view='open',editingId=null;
 function openEditor(record){editingId=record?String(record.id):null;form.reset();d.value=record?.date||today();cat.value=record?.category||'Water';area.value=record?.area||'';status.value=record?.status||'Planned';notes.value=record?.details||'';
  $('p4OpsEditorHeading').textContent=record?'Edit farm operation':'Record an operation';$('p4SaveOperation').textContent=record?'Save changes':'Save farm operation';editor.hidden=false;$('p4NewOperation').setAttribute('aria-expanded','true');editor.scrollIntoView({behavior:'smooth',block:'start'});d.focus({preventScroll:true});}
 function closeEditor(){editor.hidden=true;form.reset();editingId=null;$('p4NewOperation').setAttribute('aria-expanded','false');}
 function isOverdue(op){return op.status!=='Completed'&&/^\d{4}-\d{2}-\d{2}$/.test(String(op.date))&&op.date<today();}
 function belongsView(op){if(view==='all')return true;if(view==='completed')return op.status==='Completed';if(view==='attention')return op.status==='Needs attention'||isOverdue(op);return op.status!=='Completed';}
 function render(){const all=read(),sorted=all.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  $('p4OpsFarm').textContent=farm();$('p4OpsPlanned').textContent=all.filter(x=>x.status==='Planned').length;$('p4OpsAttention').textContent=all.filter(x=>x.status==='Needs attention').length;$('p4OpsOverdue').textContent=all.filter(isOverdue).length;$('p4OpsCompleted').textContent=all.filter(x=>x.status==='Completed').length;
  const query=search.value.trim().toLowerCase(),category=filterCategory.value;
  const shown=sorted.filter(op=>belongsView(op)&&(category==='all'||op.category===category)&&(!query||[op.category,op.area,op.details,op.status,op.date].join(' ').toLowerCase().includes(query)));
  $('p4OpsCount').textContent=shown.length+' of '+all.length+' records';
  if(!shown.length){list.innerHTML='<div class="v53p4-empty">'+(all.length?'No operations match this selection.':'No operations yet. Use “New operation” to plan work or record an activity.')+'</div>';return;}
  // Render with escaped text. Only user data is escaped; actions are bound by index in the current read list.
  list.innerHTML=shown.map(op=>{const id=all.indexOf(op);const overdue=isOverdue(op);
   return '<article class="v53p4-task" data-op-index="'+id+'"><div class="v53p4-task-top"><div><h3>'+escape(op.category||'General')+' · '+escape(op.area||'Farm')+'</h3><div class="v53p4-task-meta">'+escape(op.date||'Undated')+'</div></div><span class="v53p4-chip'+(overdue?' is-late':'')+'">'+(overdue?'Overdue · ':'')+escape(op.status||'Planned')+'</span></div><p>'+escape(op.details||'No notes added.')+'</p><div class="v53p4-task-actions"><button type="button" data-action="edit">Edit</button>'+(op.status==='Completed'?'':'<button type="button" class="v53p4-done" data-action="done">Mark completed</button>')+'<button type="button" data-action="delete">Delete</button></div></article>';}).join('');
 }
 $('p4NewOperation').addEventListener('click',()=>editor.hidden?openEditor(null):closeEditor());
 $('p4CancelOperation').addEventListener('click',closeEditor);$('p4DiscardOperation').addEventListener('click',closeEditor);
 form.addEventListener('submit',event=>{event.preventDefault();if(!d.value){alert('Choose the operation date.');return;}
  const all=read(),editIndex=editingId===null?-1:all.findIndex(x=>String(x.id)===editingId);
  const updated={...(editIndex>=0?all[editIndex]:{}),id:editIndex>=0?all[editIndex].id:(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)),date:d.value,category:cat.value,area:area.value.trim(),status:status.value,details:notes.value.trim(),createdAt:editIndex>=0?(all[editIndex].createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(editIndex>=0)all[editIndex]=updated;else all.push(updated);save(all);closeEditor();render();window.LivestockCore?.showToast?.('Farm operation saved.','success');});
 list.addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;const card=button.closest('[data-op-index]');const index=Number(card?.dataset.opIndex);const all=read(),op=all[index];if(!op)return;
  const action=button.dataset.action;if(action==='edit'){openEditor(op);return;}
  if(action==='delete'&&!confirm('Delete this farm operation?'))return;
  if(action==='delete')all.splice(index,1);else if(action==='done'){all[index]={...op,status:'Completed',completedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};}
  save(all);render();window.LivestockCore?.showToast?.(action==='delete'?'Operation deleted.':'Operation completed.','success');});
 document.querySelectorAll('[data-p4-filter]').forEach(btn=>btn.addEventListener('click',()=>{view=btn.dataset.p4Filter;document.querySelectorAll('[data-p4-filter]').forEach(x=>x.classList.toggle('is-active',x===btn));render();}));
 search.addEventListener('input',render);filterCategory.addEventListener('change',render);
 window.addEventListener('storage',event=>{if(!event.key||event.key.includes('farmOperations'))render();});
 window.addEventListener('livestock:sync',e=>{if(e.detail?.state==='synced')render();});
 render();
});
