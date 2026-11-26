
'use strict';
const STATUS = new Set(['open','in_progress','resolved','closed']);
const CATEGORY = new Set(['account','subscription','payment','cloud_sync','animal_records','other']);
function cleanSubject(x){return String(x||'').trim().replace(/\s+/g,' ').slice(0,140)}
function cleanDescription(x){return String(x||'').trim().slice(0,4000)}
function validateTicket(body){
 const subject=cleanSubject(body?.subject),description=cleanDescription(body?.description),category=String(body?.category||'other');
 if(subject.length<5||description.length<15||!CATEGORY.has(category))return null;
 return {subject,description,category};
}
function validStatus(s){return STATUS.has(s);}
function installSupport(app,{pool,requireAuth,asyncRoute,limit}){
 // User-created tickets only; never expose other farmers' tickets.
 app.post('/api/support/tickets',requireAuth,limit(10,60*60*1000),asyncRoute(async(req,res)=>{
  const data=validateTicket(req.body);if(!data)return res.status(400).json({error:'Enter a subject (5+ characters), details (15+ characters) and a valid category.'});
  const q=await pool.query(`INSERT INTO lm_support_tickets(user_id,category,subject,description) VALUES($1,$2,$3,$4) RETURNING id,status,created_at`,[req.authUser.id,data.category,data.subject,data.description]);
  res.status(201).json({ticket:q.rows[0]});
 }));
 app.get('/api/support/tickets',requireAuth,asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT id,category,subject,status,created_at,updated_at FROM lm_support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,[req.authUser.id]);
  res.json({tickets:q.rows});
 }));
}
module.exports={installSupport,validateTicket,validStatus};

// Public help-centre extension. It does not expose existing farmers' records.
// A guest may submit an enquiry. Only an MFA-verified founder may read/change it.
const {normalizeEmail,validEmail,digest}=require('./security');
const {founderAllowed,validElevation}=require('./admin');
const PUBLIC_CATEGORIES=new Set(['account','verification','payment','cloud_sync','animal_records','other']);
function validatePublicRequest(input){
 const name=String(input?.name||'').trim().replace(/\s+/g,' ').slice(0,120);
 const email=normalizeEmail(input?.email);
 const category=String(input?.category||'other');
 const subject=cleanSubject(input?.subject),description=cleanDescription(input?.description);
 if(name.length<2||!validEmail(email)||!PUBLIC_CATEGORIES.has(category)||subject.length<5||description.length<15)return null;
 return {name,email,category,subject,description};
}
function installPublicSupport(app,{pool,requireAuth,asyncRoute,limit,env=process.env}){
 app.post('/api/support/public',limit(3,60*60*1000),asyncRoute(async(req,res)=>{
  // Honeypot: automated submissions that fill this invisible field receive a neutral response.
  if(String(req.body?.website||'').trim())return res.status(202).json({ok:true});
  const data=validatePublicRequest(req.body);
  if(!data)return res.status(400).json({error:'Enter a valid name, email, subject and problem description.'});
  const q=await pool.query(`INSERT INTO lm_public_support_tickets(name,email,category,subject,description)
   VALUES($1,$2,$3,$4,$5) RETURNING id`,[data.name,data.email,data.category,data.subject,data.description]);
  res.status(201).json({ok:true,reference:`LM-${q.rows[0].id}`});
 }));
 // Admin extension uses the very same verified farmer session + founder allowlist + TOTP elevation.
 // Do not create these routes at all when the Admin Centre is disabled.
 if(env.ADMIN_PANEL_ENABLED!=='true')return;
 const founder=(req,res,next)=>{
  if(!founderAllowed(req.authUser?.email,env))return res.status(403).json({error:'Administrator access denied.'});
  next();
 };
 const elevated=(req,res,next)=>{
  if(!env.ADMIN_SIGNING_SECRET||!req.rawSession||!validElevation(req,env.ADMIN_SIGNING_SECRET,req.authUser.id,digest(req.rawSession)))
   return res.status(403).json({code:'ADMIN_LOCKED',error:'Administrator verification required.'});
  next();
 };
 const onlyFounder=[requireAuth,founder,elevated];
 app.get('/api/admin/public-support',...onlyFounder,asyncRoute(async(req,res)=>{
  const status=String(req.query.status||'all');
  if(status!=='all'&&!validStatus(status))return res.status(400).json({error:'Invalid support status.'});
  const q=await pool.query(`SELECT id,name,email,category,subject,description,status,created_at,updated_at
   FROM lm_public_support_tickets WHERE ($1='all' OR status=$1) ORDER BY created_at DESC LIMIT 100`,[status]);
  res.json({tickets:q.rows});
 }));
 // An independent route for signed-in farmer tickets lets V5.4 (before V5.4.1) use the same support inbox.
 app.get('/api/admin/customer-support',...onlyFounder,asyncRoute(async(req,res)=>{
  const status=String(req.query.status||'all');
  if(status!=='all'&&!validStatus(status))return res.status(400).json({error:'Invalid support status.'});
  const q=await pool.query(`SELECT t.id,t.category,t.subject,t.description,t.status,t.created_at,t.updated_at,u.email,u.full_name
   FROM lm_support_tickets t JOIN lm_auth_users u ON u.id=t.user_id
   WHERE ($1='all' OR t.status=$1) ORDER BY t.created_at DESC LIMIT 100`,[status]);
  res.json({tickets:q.rows});
 }));
 app.patch('/api/admin/customer-support/:id',limit(25),...onlyFounder,asyncRoute(async(req,res)=>{
  const id=String(req.params.id||''),status=String(req.body?.status||'');
  if(!/^[1-9]\d{0,17}$/.test(id)||!validStatus(status))return res.status(400).json({error:'Invalid ticket or status.'});
  const db=await pool.connect();
  try{await db.query('BEGIN');
   const q=await db.query(`UPDATE lm_support_tickets SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,status`,[id,status]);
   if(!q.rowCount){await db.query('ROLLBACK');return res.status(404).json({error:'Ticket not found.'});}
   await db.query('INSERT INTO lm_admin_audit(actor_user_id,action) VALUES($1,$2)',[req.authUser.id,`support_${status}`]);
   await db.query('COMMIT');res.json({ticket:q.rows[0]});
  }catch(err){await db.query('ROLLBACK').catch(()=>{});throw err;}finally{db.release();}
 }));
 app.patch('/api/admin/public-support/:id',limit(25),...onlyFounder,asyncRoute(async(req,res)=>{
  const id=String(req.params.id||''),status=String(req.body?.status||'');
  if(!/^[1-9]\d{0,17}$/.test(id)||!validStatus(status))return res.status(400).json({error:'Invalid ticket or status.'});
  const db=await pool.connect();
  try{await db.query('BEGIN');
   const q=await db.query(`UPDATE lm_public_support_tickets SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,status`,[id,status]);
   if(!q.rowCount){await db.query('ROLLBACK');return res.status(404).json({error:'Enquiry not found.'});}
   await db.query('INSERT INTO lm_admin_audit(actor_user_id,action) VALUES($1,$2)',[req.authUser.id,`public_support_${status}`]);
   await db.query('COMMIT');res.json({ticket:q.rows[0]});
  }catch(err){await db.query('ROLLBACK').catch(()=>{});throw err;}finally{db.release();}
 }));
}
const baseInstallSupport=module.exports.installSupport;
module.exports.installSupport=function(app,deps){baseInstallSupport(app,deps);installPublicSupport(app,deps);};
module.exports.validatePublicRequest=validatePublicRequest;
module.exports.installPublicSupport=installPublicSupport;
