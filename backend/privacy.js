'use strict';
const {checkPassword}=require('./security');
const TYPES=new Set(['access','correction','export','deletion','objection']);
const EXPORTS=Object.freeze({
 account:'SELECT id,full_name,email,email_verified_at,created_at,updated_at FROM lm_auth_users WHERE id=$1',
 farms:'SELECT farm_id,name,location,operation,map_url,created_at,updated_at FROM lm_farms WHERE user_id=$1',
 animals:'SELECT farm_id,animal_id,data,version,created_at,updated_at FROM lm_v5_animals WHERE user_id=$1',
 photos:'SELECT animal_id,photo,version,updated_at FROM lm_v5_animal_photos WHERE user_id=$1',
 farmDocuments:'SELECT record_key,data,version,updated_at FROM lm_farm_records WHERE user_id=$1',
 subscriptions:'SELECT plan,status,current_period_end,created_at,updated_at FROM lm_billing_subscriptions WHERE user_id=$1',
 payments:'SELECT m_payment_id,plan,amount,status,created_at FROM lm_billing_payments WHERE user_id=$1',
 billingEvents:'SELECT payment_status,amount_gross,created_at FROM lm_billing_events WHERE user_id=$1',
 alerts:'SELECT email_alerts,last_digest_on,updated_at FROM lm_alert_prefs WHERE user_id=$1',
 support:'SELECT id,category,subject,description,status,created_at,updated_at FROM lm_support_tickets WHERE user_id=$1'
});
function validate(body){const type=body?.type,details=typeof body?.details==='string'?body.details.trim():'';return TYPES.has(type)&&details.length>=15&&details.length<=3500?{type,details}:null;}
async function exportAccount(pool,userId){const db=await pool.connect();try{await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const out={format:'livestock-manager-account-export-v1',generatedAt:new Date().toISOString(),scope:'Server records across all farms; excludes credentials, payment tokens, public enquiries, provider data and unsynced device records.'};for(const [key,sql] of Object.entries(EXPORTS))out[key]=(await db.query(sql,[userId])).rows;if(!out.account.length)throw new Error('Account not found');await db.query('COMMIT');return out;}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{db.release();}}
function installPrivacy(app,{pool,requireAuth,asyncRoute,limit,sendMail,origin,logger}){
 app.get('/api/privacy/export',requireAuth,limit(3,60*60*1000),asyncRoute(async(req,res)=>{const data=await exportAccount(pool,req.authUser.id);res.attachment('livestock-manager-account-export.json').type('application/json').json(data);}));
 app.post('/api/privacy/requests',requireAuth,limit(5,60*60*1000),asyncRoute(async(req,res)=>{
  const d=validate(req.body);if(!d)return res.status(400).json({error:'Choose a request type and enter 15–3500 characters.'});
  if(d.type==='deletion'){
   if(req.body.confirmation!=='REQUEST DELETION'||typeof req.body.password!=='string'||req.body.password.length>128)return res.status(400).json({error:'Confirm the request and enter your current password.'});
   const q=await pool.query('SELECT password_hash FROM lm_auth_users WHERE id=$1',[req.authUser.id]);if(!q.rowCount||!await checkPassword(req.body.password,q.rows[0].password_hash))return res.status(403).json({error:'Current password is incorrect.'});
  }
  const q=await pool.query('INSERT INTO lm_support_tickets(user_id,category,subject,description) VALUES($1,$2,$3,$4) RETURNING id,status,created_at',[req.authUser.id,'account',`Privacy: ${d.type}`,d.details]);
  let emailAccepted=false;try{await sendMail({to:req.authUser.email,name:req.authUser.full_name,kind:'privacy',link:origin+'/account-privacy.html'});emailAccepted=true;}catch(e){logger.warn('Privacy receipt email not accepted');}
  res.status(201).json({ticket:q.rows[0],emailAccepted,message:'Request recorded for review. No account or subscription has been deleted or cancelled.'});
 }));
 app.get('/api/privacy/requests',requireAuth,asyncRoute(async(req,res)=>{const q=await pool.query("SELECT id,subject,status,created_at,updated_at FROM lm_support_tickets WHERE user_id=$1 AND subject LIKE 'Privacy: %' ORDER BY created_at DESC LIMIT 50",[req.authUser.id]);res.json({tickets:q.rows});}));
}
module.exports={validate,exportAccount,installPrivacy,EXPORTS};
