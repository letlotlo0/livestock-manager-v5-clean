/* Self-contained A4 PDF generator: no CDN, no external servers, no uploads.
   Uses built-in PDF Helvetica to keep downloadable reports available offline. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.LMReportPDF=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PAGE_W=595,PAGE_H=842,L=46,RIGHT=549,WIDTH=RIGHT-L;
 function simplify(s){return String(s==null?'':s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u2013\u2014]/g,'-').replace(/[\u00a0]/g,' ').replace(/[^\x20-\x7e\n]/g,'?');}
 const esc=s=>simplify(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 function splitText(text,max=96){const words=simplify(text).split(/\s+/);let lines=[],line='';for(let word of words){if(!word)continue;if(word.length>max){if(line){lines.push(line);line='';}while(word.length>max){lines.push(word.slice(0,max));word=word.slice(max);}}if((line+' '+word).trim().length>max){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines.length?lines:[''];}
 function build({reports,generatedAt=new Date().toISOString(),scope='farm',source='Cloud-confirmed'}){
  if(!Array.isArray(reports)||!reports.length)throw Error('No farm reports supplied');
  const pages=[],cur={lines:[],y:750};
  function txt(str,x,y,size=10,bold=false,color=[.17,.24,.15]){const [r,g,b]=color;cur.lines.push(`${r} ${g} ${b} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(str)}) Tj ET`);}
  function line(y){cur.lines.push(`0.86 0.88 0.84 RG 0.7 w ${L} ${y} m ${RIGHT} ${y} l S`);}
  function rect(x,y,w,h,fill=[.95,.96,.93]){cur.lines.push(`${fill.join(' ')} rg ${x} ${y} ${w} ${h} re f`);}
  function flush(){pages.push(cur.lines.join('\n'));cur.lines=[];cur.y=750;}
  function newPage(){if(cur.lines.length)flush();drawHeader();}
  function drawHeader(){rect(0,802,PAGE_W,40,[.18,.27,.13]);txt('LIVESTOCK MANAGER',L,819,14,true,[1,1,1]);txt('FARM PERFORMANCE REPORT',349,821,9,true,[1,1,1]);line(787);cur.y=760;}
  function need(h=18){if(cur.y-h<57)newPage();}
  function title(str){need(48);txt(str,L,cur.y,19,true);cur.y-=19;line(cur.y-9);cur.y-=28;}
  function subsection(str){need(33);txt(str,L,cur.y,12,true,[.25,.36,.15]);cur.y-=23;}
  function p(str){for(const ln of splitText(str,99)){need(16);txt(ln,L,cur.y,10,false);cur.y-=15;}cur.y-=6;}
  function pair(label,value){need(20);txt(label,L+7,cur.y,10);txt(value,350,cur.y,10,true);cur.y-=19;}
  function row(values,widths,font=9,bold=false){need(18);let x=L;values.forEach((v,i)=>{let max=Math.max(6,Math.floor(widths[i]/(font*.51)));let s=simplify(v);if(s.length>max)s=s.slice(0,max-2)+'..';txt(s,x+4,cur.y,font,bold);x+=widths[i];});cur.y-=17;line(cur.y+6);}
  function table(head,rows,widths){row(head,widths,8,true);for(const r of rows)row(r,widths,8,false);cur.y-=12;}
  function amount(n){return 'R'+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function col(s){return String(s||'--');}
  newPage();
  txt(scope==='portfolio'?'MY FARMING PORTFOLIO':'FARM PERFORMANCE',L,cur.y,26,true,[.2,.3,.12]);cur.y-=34;
  p('Generated: '+new Date(generatedAt).toLocaleString('en-ZA')+' | Data: '+source);
  p('Period: '+(reports[0].period==='all'?'All recorded history':reports[0].period==='year'?'Current calendar year':'Last 12 months'));
  subsection('At a glance');
  const cover=reports.reduce((o,r)=>({animals:o.animals+r.animalCount,sales:o.sales+r.salesIncome,costs:o.costs+r.operatingCosts,profit:o.profit+r.operatingResult,missing:o.missing+r.missingBasis}),{animals:0,sales:0,costs:0,profit:0,missing:0});
  pair('Farms included',String(reports.length));pair('Registered animals',String(cover.animals));pair('Livestock sales',amount(cover.sales));pair('Recorded operating costs',amount(cover.costs));pair('Recorded operating result',cover.missing?'INCOMPLETE - '+amount(cover.profit):amount(cover.profit));
  p('This document summarizes all active animals, recorded sales and expenses, and management-level farm performance. See notes inside for coverage and limitations.');
  if(scope==='portfolio'){
   title('Portfolio executive summary');
   const total=reports.reduce((o,r)=>({animals:o.animals+r.animalCount,sales:o.sales+r.salesIncome,costs:o.costs+r.operatingCosts,profit:o.profit+r.operatingResult,missing:o.missing+r.missingBasis}),{animals:0,sales:0,costs:0,profit:0,missing:0});
   pair('Number of farms',String(reports.length));pair('Registered animals',String(total.animals));pair('Sales income',amount(total.sales));pair('Recorded operating costs',amount(total.costs));pair('Recorded operating result',amount(total.profit));
   if(total.missing)p('IMPORTANT: '+total.missing+' sale(s) have incomplete cost information; portfolio profitability cannot be confirmed.');
   subsection('Farm comparison');
   table(['FARM','ANIMALS','SALES','OPERATING RESULT'],reports.map(r=>[r.farm.name,String(r.animalCount),amount(r.salesIncome),r.missingBasis?'Incomplete':amount(r.operatingResult)]),[191,59,111,142]);
  }
  for(const r of reports){
   newPage();title(r.farm.name);
   p([r.farm.operation,r.farm.location].filter(Boolean).join(' | '));
   subsection('Executive assessment');p(r.assessment);
   subsection('Livestock position');pair('Registered animals',String(r.animalCount));pair('Animals sold in selected period',String(r.sold.length));pair('Active livestock purchase investment',amount(r.activePurchaseInvestment));pair('Estimated active herd value (unrealized)',amount(r.estimatedHerdValue));
   subsection('Income and spending');
   pair('Livestock sales income',amount(r.salesIncome));pair('Recorded cost of animals sold',amount(r.soldBasis));pair('Feed expenditure',amount(r.feedExpense));pair('Treatment and health expenditure',amount(r.healthExpense));pair('Other farm expenses',amount(r.otherExpense));line(cur.y-3);cur.y-=17;
   pair('Total recognized operating costs',amount(r.operatingCosts));pair('Recorded operating result',r.missingBasis?'Incomplete: '+amount(r.operatingResult):amount(r.operatingResult));
   subsection('Species composition');p(Object.entries(r.animalTypes).map(([k,v])=>k+': '+v).join('  |  ')||'No registered animals.');
   subsection('Data coverage and important cautions');r.warnings.forEach(w=>p('- '+w));
   newPage();title(r.farm.name+' - animal register');
   p('Every currently registered animal on this farm. Large registers continue onto additional pages.');
   const animalRows=r.animals.map((a,i)=>[String(i+1),col(a.animalTag||a.tag||a.id),col(a.name),col(a.type||a.species),col(a.breed),amount(a.purchasePrice),amount(a.estimatedValue)]);
   table(['#','TAG/ID','NAME','SPECIES','BREED','PURCHASE','EST. VALUE'],animalRows,[21,105,92,68,85,65,67]);
   if(!animalRows.length)p('No animals registered.');
   subsection('Animal-by-animal details');
   r.animals.forEach(a=>{
     const text=[a.animalTag||a.tag||a.id||'Unlabelled',a.name||'',a.type||a.species||'',a.breed||'',
       a.sex?'Sex: '+a.sex:'',a.birthDate?'Born: '+a.birthDate:'',a.weight?'Weight: '+a.weight+' kg':'',
       a.pregnant?'Pregnant':''].filter(Boolean).join(' | ');p(text);
   });
   subsection('Animals sold (selected period)');
   const saleRows=r.sold.map(a=>[col(a.animalTag||a.tag||a.id),col(a.name),col(a.saleDate),amount(a.sellingPrice),a.purchasePrice!=null?amount(a.purchasePrice):a.totalInvestment!=null?amount(a.totalInvestment):'MISSING']);
   table(['TAG / ID','ANIMAL','SOLD ON','SALE PRICE','COST BASIS'],saleRows,[105,122,92,90,94]);
   if(!saleRows.length)p('No animal sales recorded.');
   newPage();title(r.farm.name+' - spending ledger');
   p('Recorded general farm expenses. Additional feed and health totals appear in the financial summary.');
   const spendRows=r.expenses.map(a=>[col(a.date),col(a.category),col(a.description),amount(a.amount)]);
   table(['DATE','CATEGORY','DESCRIPTION','AMOUNT'],spendRows,[86,120,190,107]);
   if(!spendRows.length)p('No general farm expenses recorded for this period.');
   subsection('Feed purchases');
   table(['DATE','DESCRIPTION / SUPPLIER','AMOUNT'],r.feed.map(a=>[col(a.date||a.purchaseDate),col(a.description||a.item||a.supplier||a.feedType),amount(a.amount??a.cost??a.price)]),[100,267,136]);
   if(!r.feed.length)p('No feed expenses recorded.');
   subsection('Treatment and health expenses');
   table(['DATE','TREATMENT / DESCRIPTION','AMOUNT'],r.health.map(a=>[col(a.date||a.treatmentDate),col(a.treatment||a.description||a.medicine||a.type),amount(a.amount??a.cost??a.price)]),[100,267,136]);
   if(!r.health.length)p('No health expenses recorded.');
   subsection('Important financial definitions');
   p('Operating result = recorded livestock sales - recorded cost of sold animals - recorded feed, health and general expenses. It does not include value changes in animals still owned.');
   p('Herd purchase investment is displayed separately to avoid treating every animal purchase as an immediate operating loss. Actual cash flow requires a complete dated payment register.');
   p('This is a management report generated from user-entered records and is not a tax return, audited statement or independent valuation.');
  }
  if(cur.lines.length)flush();
  const objs=[null],add=s=>{objs.push(s);return objs.length-1;};
  const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesId=add('');
  const pageIds=[];
  for(let i=0;i<pages.length;i++){
   // Page footer is inserted into the content stream rather than the visible UI.
   const stream=pages[i]+`\n0.45 0.50 0.43 rg BT /F1 9 Tf 1 0 0 1 46 29 Tm (${esc('Livestock Manager | '+source)}) Tj ET\nBT /F1 9 Tf 1 0 0 1 500 29 Tm (${i+1} / ${pages.length}) Tj ET`;
   const content=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
   pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[pagesId]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
  const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let doc='%PDF-1.4\n',offsets=[0];
  for(let i=1;i<objs.length;i++){offsets[i]=doc.length;doc+=i+' 0 obj\n'+objs[i]+'\nendobj\n';}
  const xref=doc.length;doc+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objs.length;i++)doc+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  doc+=`trailer\n<< /Size ${objs.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Array.from(doc,c=>c.charCodeAt(0)));
 }
 function download({reports,scope,source,name}){const bytes=build({reports,scope,source});const href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=href;a.download=name||'livestock-farm-report.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2500);return bytes.length;}
 return {build,download};
});
