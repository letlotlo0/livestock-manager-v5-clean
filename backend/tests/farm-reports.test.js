'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const R=require('../../frontend/farm-report.js'),PDF=require('../../frontend/lm-pdf.js');
const cattle={id:'main',name:'Main Cattle Farm',location:'North West',operation:'Cattle breeding'};
const goat={id:'22222222-2222-4222-8222-222222222222',name:'Goat Farm'};
const data={livestockAnimals:[{id:'animal-1',type:'Cattle',purchasePrice:13000,estimatedValue:20000}],
 soldLivestock:[{id:'sold-1',purchasePrice:10000,sellingPrice:15000,saleDate:'2026-11-01'}],
 farmExpenses:[{id:'ex-1',amount:700,date:'2026-11-05'}],
 farmFeedPurchases:[{id:'feed-1',amount:1200,date:'2026-11-04'}],
 livestockHealthRecords:[{id:'health-1',amount:300,date:'2026-11-03'}]};
test('calculates farm operating result but keeps active herd purchase investment separate',()=>{
 const r=R.calculate(cattle,data);assert.equal(r.salesIncome,15000);assert.equal(r.operatingCosts,12200);assert.equal(r.operatingResult,2800);
 assert.equal(r.activePurchaseInvestment,13000);assert.equal(r.estimatedHerdValue,20000);assert.equal(r.profitable,'positive');
});
test('missing cost basis produces incomplete assessment, not a false profit declaration',()=>{
 const r=R.calculate(cattle,{soldLivestock:[{id:'s',sellingPrice:14000,saleDate:'2026-11-07'}]});
 assert.equal(r.missingBasis,1);assert.equal(r.profitable,'incomplete');assert.match(r.assessment,/reliable profit/i);
});
test('a default zero purchase price is not treated as proof that breeding cost was zero',()=>{
 const r=R.calculate(cattle,{soldLivestock:[{id:'s',sellingPrice:20000,purchasePrice:0,saleDate:'2026-11-12'}]});
 assert.equal(r.missingBasis,1);assert.equal(r.profitable,'incomplete');
});
test('period filter excludes undated financial transactions and warns about missing dates',()=>{
 const r=R.calculate(cattle,{soldLivestock:[{sellingPrice:2000,purchasePrice:1200}],farmExpenses:[{amount:500}]},'year',new Date('2026-11-18'));
 assert.equal(r.salesIncome,0);assert.equal(r.undatedTransactions,2);assert.equal(r.operatingResult,0);
});
test('yearly report window starts on January 1 in the local calendar',()=>{
 assert.equal(R.interval('year',new Date(2026,10,18,12,0,0)),'2026-01-01');
});
test('totalInvestment supplies cost basis when default purchasePrice was zero',()=>{
 const r=R.calculate(cattle,{soldLivestock:[{sellingPrice:14000,purchasePrice:0,totalInvestment:9000}]});
 assert.equal(r.missingBasis,0);assert.equal(r.soldBasis,9000);
});
test('separate farms produce separate totals; portfolio combines without mixing ledger rows',()=>{
 const a=R.calculate(cattle,data),b=R.calculate(goat,{livestockAnimals:[{id:'goat-1'}]});
 const total=R.combine([a,b]);assert.equal(total.farmCount,2);assert.equal(total.animalCount,2);assert.equal(b.salesIncome,0);assert.equal(total.salesIncome,15000);
});
test('writes valid multipage report with all animal register entries',()=>{
 const animals=Array.from({length:125},(_,i)=>({id:'a'+i,name:'Animal '+i,animalTag:'A'+i,type:'Cattle',breed:'Brahman'}));
 const r=R.calculate(cattle,{...data,livestockAnimals:animals});
 const pdf=PDF.build({reports:[r],scope:'farm'});
 assert.equal(Buffer.from(pdf).subarray(0,8).toString(),'%PDF-1.4');
 const text=Buffer.from(pdf).toString('latin1');
 assert.match(text,/Animal 124/);assert.match(text,/xref\n0/);
 const pages=Number(text.match(/\/Count (\d+)/)?.[1]);assert(pages>=5,'large animal registers must paginate');
});
