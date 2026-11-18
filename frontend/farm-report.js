/* Pure reporting calculations. All figures are based on recorded transactions, not accounting entries. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;root.LMFarmReports=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const arr=x=>Array.isArray(x)?x:[];
 const number=x=>{if(x===null||x===undefined||x==='')return null;const v=Number(x);return Number.isFinite(v)?v:null;};
 const first=(obj,names)=>{for(const n of names){const v=number(obj?.[n]);if(v!==null)return v;}return null;};
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const money=n=>'R'+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
 const dateOf=(item,keys)=>{for(const key of keys){const v=item?.[key];if(v&&/^\d{4}-\d{2}-\d{2}/.test(String(v)))return String(v).slice(0,10);}return '';};
 function interval(period,now=new Date()){
  const localDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(period==='year')return localDate(new Date(now.getFullYear(),0,1));
  if(period==='12m'){const d=new Date(now);d.setFullYear(d.getFullYear()-1);return localDate(d);}
  return '';
 }
 function recordsInPeriod(records,period,dateKeys,missing){
  const after=interval(period);
  if(!after)return arr(records);
  return arr(records).filter(item=>{const d=dateOf(item,dateKeys);if(!d){missing.count++;return false;}return d>=after;});
 }
 function total(records,keys){return round(arr(records).reduce((sum,item)=>sum+(first(item,keys)||0),0));}
 function calculate(farm,records,period='all',now=new Date()){
  const animals=arr(records?.livestockAnimals),sold=arr(records?.soldLivestock);
  const absent={count:0},sales=recordsInPeriod(sold,period,['saleDate','date','soldDate'],absent);
  const feed=recordsInPeriod(records?.farmFeedPurchases,period,['date','purchaseDate','createdAt'],absent);
  const health=recordsInPeriod(records?.livestockHealthRecords,period,['date','treatmentDate','createdAt'],absent);
  const expenses=recordsInPeriod(records?.farmExpenses,period,['date','createdAt'],absent);
  const salesIncome=total(sales,['sellingPrice','salePrice']);
  let soldBasis=0,missingBasis=0;
  for(const a of sales){
   // Use purchase price where available. totalInvestment may already include health/feed expenses.
   const buy=number(a.purchasePrice),investment=number(a.totalInvestment);
   const rawBasis=buy!==null&&buy>0?buy:investment!==null&&investment>0?investment:buy===0||investment===0?0:null;
   // The animal form defaults a blank purchase price to 0. Zero is not evidence
   // that a home-bred animal had zero production cost.
   const basis=rawBasis===0&&!a.costBasisConfirmed?null:rawBasis;
   if(basis===null)missingBasis++;
   else soldBasis+=basis;
  }
  soldBasis=round(soldBasis);
  const feedExpense=total(feed,['amount','cost','price']);
  const healthExpense=total(health,['amount','cost','price']);
  const otherExpense=total(expenses,['amount']);
  const operatingCosts=round(soldBasis+feedExpense+healthExpense+otherExpense);
  const operatingResult=round(salesIncome-operatingCosts);
  const activePurchaseInvestment=total(animals,['purchasePrice']);
  const estimatedHerdValue=total(animals,['estimatedValue']);
  const missingHerdValue=animals.filter(a=>first(a,['estimatedValue'])===null).length;
  const animalTypes={};for(const a of animals){const k=String(a.type||a.species||'Unspecified');animalTypes[k]=(animalTypes[k]||0)+1;}
  const totalSales=arr(sold).length;
  const activity=sales.length+feed.length+health.length+expenses.length;
  const profitable=missingBasis===0&&activity>0?operatingResult>0? 'positive':operatingResult<0?'negative':'break-even':'incomplete';
  let assessment;
  if(activity===0)assessment='No recorded sales or running costs for this period. Profitability cannot yet be determined.';
  else if(missingBasis)assessment='Incomplete: '+missingBasis+' sale(s) have no recorded cost basis. A reliable profit/loss conclusion is not possible.';
  else if(operatingResult>0)assessment='Positive recorded operating result. This is not an audited net profit and may exclude costs not entered into the app.';
  else if(operatingResult<0)assessment='Negative recorded operating result. Review costs and income; animal value held on the farm is excluded from this figure.';
  else assessment='Recorded operating result is break-even for this period.';
  const warnings=[];
  if(missingBasis)warnings.push(missingBasis+' sold animal(s) have no known purchase/production cost');
  if(absent.count)warnings.push(absent.count+' undated transaction(s) excluded from the selected period');
  if(missingHerdValue)warnings.push(missingHerdValue+' active animal(s) have no estimated value');
  if(health.length||feed.length)warnings.push('Check that feed and treatment costs were not also entered in general farm expenses');
  warnings.push('Figures exclude unrecorded labour, depreciation, taxes, other costs, and inventory valuation changes');
  return {farm:{id:farm.id,name:farm.name,location:farm.location||'',operation:farm.operation||''},period,
    animals,animalTypes,sold:sales,feed,health,expenses,activity,totalSales,
    salesIncome,soldBasis,feedExpense,healthExpense,otherExpense,operatingCosts,operatingResult,
    activePurchaseInvestment,estimatedHerdValue,missingHerdValue,missingBasis,undatedTransactions:absent.count,
    profitable,assessment,warnings,animalCount:animals.length};
 }
 function combine(reports){const sums=['animalCount','salesIncome','soldBasis','feedExpense','healthExpense','otherExpense','operatingCosts','operatingResult','activePurchaseInvestment','estimatedHerdValue','missingBasis','missingHerdValue'];const out={};for(const key of sums)out[key]=round(reports.reduce((n,r)=>n+(r[key]||0),0));out.farmCount=reports.length;out.isComplete=!out.missingBasis;return out;}
 return {calculate,combine,money,number,interval};
});
