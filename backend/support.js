
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
