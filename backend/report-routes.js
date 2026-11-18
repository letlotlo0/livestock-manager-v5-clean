'use strict';
/* Financial PDFs must come from authenticated, server-confirmed records.
 * Free accounts may still retrieve their raw JSON from the existing backup API.
 */
const billing=require('./billing');
const {entitled}=require('./plan-restrictions');
const calc=require('./report-calculations');
const pdf=require('./report-pdf');
const DOCS=new Set(['soldLivestock','farmFeedPurchases','livestockHealthRecords','farmExpenses','farmOperations']);
const farmIdValid=id=>id==='main'||/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const safeFilename=s=>String(s||'farm').replace(/[^a-z0-9_-]+/gi,'-').slice(0,50).replace(/^-+|-+$/g,'')||'farm';
async function snapshot(pool,userId,farmId){
 const [a,d]=await Promise.all([
  pool.query(`SELECT a.animal_id,a.data FROM lm_v5_animals a WHERE a.user_id=$1 AND a.farm_id=$2 ORDER BY a.created_at,a.animal_id`,[userId,farmId]),
  pool.query(`SELECT record_key,data FROM lm_farm_records WHERE user_id=$1 AND (record_key LIKE $2 OR record_key IN ('livestockProfiles','farmerProfile'))`,[userId,farmId==='main'?'%':farmId+'::%'])
 ]);
 const out={livestockAnimals:a.rows.map(r=>({...r.data,id:r.animal_id}))};
 for(const r of d.rows){
  const key=farmId==='main'?r.record_key:r.record_key.startsWith(farmId+'::')?r.record_key.slice(farmId.length+2):'';
  if(DOCS.has(key))out[key]=r.data;
 }
 return out;
}
function installReportRoutes(app,{pool,requireAuth,asyncRoute,limit,billingCfg,seedMain}){
 app.get('/api/reports/pdf',requireAuth,limit(12),asyncRoute(async(req,res)=>{
  const mode=String(req.query?.scope||'farm');
  const period=String(req.query?.period||'all');
  if(!['farm','portfolio'].includes(mode)||!['all','year','12m'].includes(period))
   return res.status(400).json({error:'Invalid report selection.'});
  const e=await billing.loadEntitlement(pool,billingCfg,req.authUser.id);
  const permission=mode==='portfolio'?'portfolioPdf':'financialPdf';
  if(!entitled(e,permission))
   return res.status(402).json({code:'PLAN_RESTRICTED',feature:permission,error:mode==='portfolio'?'A combined portfolio PDF requires Pro+.':'Financial PDF reports require Pro or Pro+.'});
  await seedMain(req.authUser.id);
  const q=await pool.query("SELECT farm_id,name,location,operation FROM lm_farms WHERE user_id=$1 ORDER BY (farm_id<>'main'),created_at,farm_id",[req.authUser.id]);
  let farms=q.rows;
  if(mode==='farm'){
   const id=String(req.query.farmId||'main');
   if(!farmIdValid(id))return res.status(400).json({error:'Invalid farm selection.'});
   farms=farms.filter(f=>f.farm_id===id);
   if(!farms.length)return res.status(404).json({error:'Farm not found.'});
   if(id!=='main'&&!entitled(e,'multiFarm'))
    return res.status(402).json({code:'FARM_READ_ONLY',error:'Download raw data for archived farms; PDFs for additional farms require Pro+.'});
  }else if(farms.length>25){
   return res.status(413).json({error:'Too many farms for one PDF. Contact support for an archive export.'});
  }
  const reports=[];
  for(const f of farms){
    const raw=await snapshot(pool,req.authUser.id,f.farm_id);
    reports.push(calc.calculate({id:f.farm_id,name:f.name,location:f.location,operation:f.operation},raw,period));
  }
  const bytes=pdf.build({reports,scope:mode,source:'Server-confirmed'});
  const name=(mode==='portfolio'?'livestock-portfolio':`livestock-${safeFilename(farms[0].name)}`)+'-'+new Date().toISOString().slice(0,10)+'.pdf';
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
  res.end(Buffer.from(bytes));
 }));
}
module.exports={installReportRoutes,snapshot};
