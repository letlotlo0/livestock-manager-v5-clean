'use strict';
// Founder-only, read-only administration. Authenticated farmer session + verified TOTP.
const crypto = require('node:crypto');
const {normalizeEmail,digest}=require('./security');
const TTL=15*60*1000;
function decodeBase32(value){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,acc=0,out=[];
 for(const ch of String(value||'').toUpperCase().replace(/[ =-]/g,'')){
  const i=alphabet.indexOf(ch);if(i<0)throw new Error('Invalid ADMIN_TOTP_SECRET');
  acc=(acc<<5)|i;bits+=5;if(bits>=8){bits-=8;out.push((acc>>bits)&255);}
 }if(out.length<20)throw new Error('ADMIN_TOTP_SECRET must be at least 160 bits.');return Buffer.from(out);
}
function validTotp(secret,code,now=Date.now()){
 if(!/^\d{6}$/.test(String(code||'')))return false;
 const key=decodeBase32(secret);
 for(const step of [-1,0,1]){
  const n=Math.floor(now/30000)+step;const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(BigInt(n));
  const h=crypto.createHmac('sha1',key).update(bytes).digest(),o=h[h.length-1]&15;
  const otp=String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0');
  if(crypto.timingSafeEqual(Buffer.from(otp),Buffer.from(String(code))))return true;
 }return false;
}
function cookie(req,name){const p=(req.headers.cookie||'').split(';').find(x=>x.trim().startsWith(name+'='));return p?p.trim().slice(name.length+1):'';}
function founderAllowed(email,env){return (env.ADMIN_EMAILS||'').split(',').map(normalizeEmail).filter(Boolean).includes(normalizeEmail(email));}
function tokenFor(secret,uid,sessionHash,expires){return crypto.createHmac('sha256',secret).update(`${uid}|${sessionHash}|${expires}`).digest('hex');}
function validElevation(req,secret,uid,sessionHash,now=Date.now()){
 const value=cookie(req,'lm_admin_elevation');const match=/^(\d{13})\.([a-f0-9]{64})$/.exec(value);
 if(!match)return false;const expires=Number(match[1]);if(expires<now||expires>now+TTL)return false;
 const expected=tokenFor(secret,uid,sessionHash,expires);
 return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(match[2]));
}
function installAdmin(app,{pool,requireAuth,asyncRoute,limit,env=process.env,origin,logger=console}){
 const enabled=env.ADMIN_PANEL_ENABLED==='true';
 if(!enabled)return;
 if(!origin.startsWith('https://')&&env.NODE_ENV!=='development')throw new Error('Admin Centre requires HTTPS');
 const secret=env.ADMIN_TOTP_SECRET, signing=env.ADMIN_SIGNING_SECRET;
 if(!secret||!signing||signing.length<32)throw new Error('Set ADMIN_TOTP_SECRET and ADMIN_SIGNING_SECRET (32+ characters)');
 decodeBase32(secret);
 if(!String(env.ADMIN_EMAILS||'').trim())throw new Error('ADMIN_EMAILS must be configured');
 const founder=(req,res,next)=>{
  if(!founderAllowed(req.authUser?.email,env))return res.status(403).json({error:'Administrator access denied.'});next();
 };
 const elevated=(req,res,next)=>{
  if(!validElevation(req,signing,req.authUser.id,digest(req.rawSession)))return res.status(403).json({code:'ADMIN_LOCKED',error:'Administrator verification required.'});next();
 };
 const privateRoute=[requireAuth,founder,elevated];
 app.post('/api/admin/unlock',limit(5,15*60*1000),requireAuth,founder,asyncRoute(async(req,res)=>{
  const valid=validTotp(secret,req.body?.code);
  await pool.query('INSERT INTO lm_admin_audit(actor_user_id,action) VALUES($1,$2)',[req.authUser.id,valid?'admin_unlock':'admin_unlock_failed']);
  if(!valid)return res.status(403).json({error:'Invalid authenticator code.'});
  const expires=Date.now()+TTL;
  const token=`${expires}.${tokenFor(signing,req.authUser.id,digest(req.rawSession),expires)}`;
  res.setHeader('Set-Cookie',`lm_admin_elevation=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=900${origin.startsWith('https://')?'; Secure':''}`);
  res.json({ok:true,expiresAt:new Date(expires).toISOString()});
 }));
 app.post('/api/admin/lock',requireAuth,founder,(req,res)=>{
  res.setHeader('Set-Cookie',`lm_admin_elevation=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${origin.startsWith('https://')?'; Secure':''}`);res.json({ok:true});
 });
 app.get('/api/admin/session',requireAuth,founder,(req,res)=>res.json({elevated:validElevation(req,signing,req.authUser.id,digest(req.rawSession))}));
 app.get('/api/admin/overview',...privateRoute,asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT
   (SELECT count(*)::int FROM lm_auth_users) users,
   (SELECT count(*)::int FROM lm_auth_users WHERE email_verified_at IS NOT NULL) verified_users,
   (SELECT count(*)::int FROM lm_farms) farms,
   (SELECT count(*)::int FROM lm_v5_animals) animals,
   (SELECT count(*)::int FROM lm_billing_subscriptions WHERE status='active' AND current_period_end>now()) active_subscriptions,
   (SELECT count(*)::int FROM lm_billing_payments WHERE status='pending') pending_payments,
   (SELECT coalesce(sum(amount_gross),0)::numeric(12,2)::text FROM lm_billing_events WHERE payment_status='COMPLETE' AND created_at>=date_trunc('month',now())) verified_payments_this_month`);
  const health=await pool.query('SELECT 1 AS ok');
  res.json({summary:q.rows[0],database:health.rowCount===1?'connected':'unknown',billingEnforced:env.BILLING_ENFORCED==='true',testMode:env.LM_V5_TEST_ONLY==='true'});
 }));
 app.get('/api/admin/users',...privateRoute,asyncRoute(async(req,res)=>{
  const search=String(req.query.q||'').trim().slice(0,100),page=Math.min(1000,Math.max(1,Number.parseInt(req.query.page,10)||1));
  const q=await pool.query(`SELECT u.id,u.full_name,u.email,u.created_at,(u.email_verified_at IS NOT NULL) verified,
   coalesce(s.plan,'free') plan,coalesce(s.status,'free') subscription_status,s.current_period_end,
   (SELECT count(*)::int FROM lm_farms f WHERE f.user_id=u.id) farm_count,
   (SELECT count(*)::int FROM lm_v5_animals a WHERE a.user_id=u.id) animal_count
   FROM lm_auth_users u LEFT JOIN lm_billing_subscriptions s ON s.user_id=u.id
   WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.full_name ILIKE '%'||$1||'%')
   ORDER BY u.created_at DESC,u.id DESC LIMIT 26 OFFSET $2`,[search,(page-1)*25]);
  res.json({users:q.rows.slice(0,25),page,hasMore:q.rows.length>25});
 }));
 app.get('/api/admin/payments',...privateRoute,asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT p.m_payment_id,p.plan,p.amount::text,p.status,p.created_at,u.email
   FROM lm_billing_payments p JOIN lm_auth_users u ON u.id=p.user_id
   ORDER BY p.created_at DESC LIMIT 50`);
  const e=await pool.query(`SELECT e.payment_status,e.amount_gross::text,e.created_at,u.email
   FROM lm_billing_events e JOIN lm_auth_users u ON u.id=e.user_id
   ORDER BY e.created_at DESC LIMIT 50`);
  res.json({payments:q.rows,verifiedNotifications:e.rows});
 }));
 app.get('/api/admin/audit',...privateRoute,asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT a.action,a.created_at,u.email actor_email FROM lm_admin_audit a JOIN lm_auth_users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 60`);
  res.json({events:q.rows});
 }));
 // Admin is not granted access to livestock or financial records belonging to individual customers.
}
module.exports={installAdmin,decodeBase32,validTotp,founderAllowed,validElevation,tokenFor};
