/* Livestock Manager V5.3 Phase 4 — finance page presentation and safer reporting. */
document.addEventListener('livestock:ready',function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const calc=window.LMFarmReports, open=$('p4AddExpense'), editor=$('p4ExpenseEditor'), expenseList=$('expenseList');
 if(!calc||!open||!editor||!expenseList)return;
 const period=$('p4FinancePeriod'), search=$('p4ExpenseSearch'), category=$('p4ExpenseCategory');
 const arr=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}};
 const money=calc.money;
 const today=()=>new Date().toISOString().slice(0,10);
 function getRecords(){return {livestockAnimals:arr('livestockAnimals'),soldLivestock:arr('soldLivestock'),farmFeedPurchases:arr('farmFeedPurchases'),livestockHealthRecords:arr('livestockHealthRecords'),farmExpenses:arr('farmExpenses')};}
 const activeFarm=()=>window.LMFarms?.getActive?.()||{id:'main',name:'My Farm'};
 const text=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 function row(container,label,value,max,format){const item=document.createElement('div');item.className='v53p4-bar-row';const name=document.createElement('span');name.textContent=label;
  const track=document.createElement('div');track.className='v53p4-track';const bar=document.createElement('i');bar.style.width=Math.max(0,Math.min(100,max>0?100*Math.abs(value)/max:0))+'%';track.append(bar);
  const amount=document.createElement('strong');amount.textContent=format?format(value):String(value);item.append(name,track,amount);container.append(item);}
 const saleDate=x=>String(x.saleDate||x.date||x.soldDate||'').slice(0,10);
 const feedDate=x=>String(x.date||x.purchaseDate||x.createdAt||'').slice(0,10);
 const healthDate=x=>String(x.date||x.treatmentDate||x.createdAt||'').slice(0,10);
 const asNumber=(x,keys)=>{for(const key of keys){if(x[key]!=null && x[key]!==''&&Number.isFinite(Number(x[key])))return Number(x[key]);}return 0;};
 function bars(summary,records){
  const expenseBars=$('p4ExpenseBars');expenseBars.replaceChildren();const breakdown=[['Feed',summary.feedExpense],['Health',summary.healthExpense],['Other',summary.otherExpense]];
  const max=Math.max(1,...breakdown.map(x=>x[1]));breakdown.forEach(([l,v])=>row(expenseBars,l,v,max,money));
  const monthBars=$('p4MonthBars');monthBars.replaceChildren();
  const threshold=calc.interval(period.value), monthly=new Map();
  const add=(key,date,amount,type)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;if(threshold&&date<threshold)return;const m=date.slice(0,7);const current=monthly.get(m)||{sales:0,cost:0};current[type]+=amount;monthly.set(m,current);};
  records.soldLivestock.forEach(x=>add('sales',saleDate(x),asNumber(x,['sellingPrice','salePrice']),'sales'));
  records.farmFeedPurchases.forEach(x=>add('feed',feedDate(x),asNumber(x,['amount','cost','price']),'cost'));
  records.livestockHealthRecords.forEach(x=>add('health',healthDate(x),asNumber(x,['amount','cost','price']),'cost'));
  records.farmExpenses.forEach(x=>add('expense',feedDate(x),asNumber(x,['amount']),'cost'));
  const months=[...monthly.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
  if(!months.length){const msg=document.createElement('p');msg.className='v53p4-micro';msg.textContent='No dated transactions in this period.';monthBars.append(msg);return;}
  const maxMonth=Math.max(1,...months.map(([,x])=>Math.max(x.sales,x.cost)));
  months.forEach(([month,x])=>{const label=new Date(month+'-01T12:00:00').toLocaleDateString('en-ZA',{month:'short',year:'2-digit'});row(monthBars,label,x.sales,maxMonth,money);row(monthBars,'↳ Costs',x.cost,maxMonth,money);});
 }
 function refreshFinancial(){
  const records=getRecords(),summary=calc.calculate(activeFarm(),records,period.value);
  text('p4FinanceFarm',activeFarm().name||'My Farm');text('p4PeriodSales',money(summary.salesIncome));
  text('p4PeriodSpending',money(summary.feedExpense+summary.healthExpense+summary.otherExpense));
  text('p4PeriodBasis',summary.missingBasis?'Incomplete':money(summary.soldBasis));
  text('p4PeriodResult',summary.missingBasis?'Incomplete':money(summary.operatingResult));
  const assessment=$('p4FinanceAssessment');assessment.textContent=summary.assessment+' Figures are based on recorded entries and may not include all farm costs.';
  assessment.classList.toggle('is-warning',summary.profitable==='incomplete'||summary.profitable==='negative');
  // Safeguard the old all-time profit card as well when sold animal costs are missing.
  const all=calc.calculate(activeFarm(),records,'all');
  const old=$('netProfit');if(old){old.textContent=all.missingBasis?'Incomplete':money(all.operatingResult);old.title='Recorded operating result, not audited net profit';}
  const originalTitle=old?.closest('.stat-card')?.querySelector('span');if(originalTitle)originalTitle.textContent='RECORDED OPERATING RESULT';
  const explanation=old?.closest('.stat-card')?.querySelector('small');if(explanation)explanation.textContent='Includes known animal cost basis, feed, health and expenses';
  const trading=$('tradingProfit');if(trading){trading.textContent=all.missingBasis?'Incomplete':money(all.salesIncome-all.soldBasis);const name=trading.closest('.overview-item')?.querySelector('span');if(name)name.textContent='RECORDED TRADING RESULT';}
  // The legacy sold-animal display assumes absent cost means zero profit. Warn instead.
  const soldRows=[...document.querySelectorAll('#soldAnimalsList .sold-item')];
  records.soldLivestock.slice().reverse().forEach((a,i)=>{
    const buy=calc.number(a.purchasePrice),total=calc.number(a.totalInvestment);
    const basis=buy!==null&&buy>0?buy:total!==null&&total>0?total:buy===0||total===0?0:null;
    if(basis!==null&&(basis!==0||a.costBasisConfirmed))return;
    const last=soldRows[i]?.querySelector('.money-column:last-child');if(!last)return;
    const label=last.querySelector('span');if(label)label.textContent='COST BASIS';
    const result=last.querySelector('strong');if(result)result.textContent='Missing';
  });
  bars(summary,records);
 }
 function toggleEditor(show){editor.hidden=!show;open.setAttribute('aria-expanded',String(show));open.textContent=show?'Close expense form':'+ Record expense';if(show){editor.scrollIntoView({behavior:'smooth',block:'start'});$('expenseDescription')?.focus({preventScroll:true});}}
 open.addEventListener('click',()=>toggleEditor(editor.hidden));
 const close=document.createElement('button');close.type='button';close.className='v53p4-btn v53p4-btn-quiet v53p4-form-close';close.textContent='Close';close.addEventListener('click',()=>toggleEditor(false));editor.append(close);
 // Keep original form and data logic untouched; place optional editor after the records.
 const main=document.querySelector('main.page-container');if(main)main.append(editor);
 const expenseForm=$('expenseForm');expenseForm?.addEventListener('submit',()=>setTimeout(()=>{refreshFinancial();refreshExpenseFilters();},0));
 function refreshExpenseFilters(){
  const data=arr('farmExpenses');const existing=category.value,values=[...new Set(data.map(x=>String(x.category||'Other')))].sort();
  category.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='All categories';category.append(all);
  values.forEach(v=>{const op=document.createElement('option');op.textContent=v;op.value=v;category.append(op);});category.value=values.includes(existing)?existing:'all';
  const query=search.value.trim().toLowerCase(),filtered=data.slice().reverse().filter(x=>(!query||[x.description,x.category,x.date].join(' ').toLowerCase().includes(query))&&(category.value==='all'||String(x.category||'Other')===category.value));
  const matching=new Set(filtered.map(x=>String(x.id)));
  const nodes=[...expenseList.children];
  // Current expense list is rendered in reverse insertion order by the existing page.
  nodes.forEach((el,index)=>{const expense=data[data.length-1-index];el.hidden=!!expense&&!matching.has(String(expense.id));});
  text('p4ExpenseMatch',filtered.length+' of '+data.length+' expenses');$('p4NoExpenseMatches').hidden=!(data.length&&!filtered.length);
 }
 [search,category].forEach(el=>el.addEventListener(el===search?'input':'change',refreshExpenseFilters));
 $('p4ClearExpense').addEventListener('click',()=>{search.value='';category.value='all';refreshExpenseFilters();});
 period.addEventListener('change',refreshFinancial);
 const observer=new MutationObserver(()=>{refreshExpenseFilters();refreshFinancial();});observer.observe(expenseList,{childList:true});
 window.addEventListener('storage',e=>{if(!e.key||['soldLivestock','farmExpenses','farmFeedPurchases','livestockHealthRecords'].some(key=>e.key.includes(key))){refreshFinancial();refreshExpenseFilters();}});
 window.addEventListener('livestock:sync',e=>{if(e.detail?.state==='synced'){refreshFinancial();refreshExpenseFilters();}});
 refreshExpenseFilters();refreshFinancial();
});
