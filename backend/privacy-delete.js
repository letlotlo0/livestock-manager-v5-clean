'use strict';
// Operator-only utility. Never expose as an HTTP route. Stop application writers first.
const {normalizeEmail}=require('./security');
const OWNED=['lm_auth_sessions','lm_auth_tokens','lm_farm_records','lm_v5_animals','lm_v5_animal_photos','lm_farms','lm_alert_prefs','lm_support_tickets','lm_billing_subscriptions','lm_billing_payments','lm_billing_events','lm_admin_audit'];
const BILLING=['lm_billing_subscriptions','lm_billing_payments','lm_billing_events','lm_admin_audit'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function processDeletion(pool,{userId,ticketId,apply=false,env={}}){
 if(!UUID.test(userId||'')||!/^[1-9]\d{0,17}$/.test(ticketId||''))throw Error('Supply exact user UUID and approved ticket ID.');
 if(apply&&(env.LM_PRIVACY_DELETE_ENABLED!=='true'||env.LM_PRIVACY_MAINTENANCE_CONFIRMED!=='true'||env.LM_PRIVACY_BACKUP_VERIFIED!=='true'||env.LM_PRIVACY_REVIEW_CONFIRMED!=='true'))throw Error('Apply requires explicit maintenance, backup and verified privacy review confirmation.');
 const db=await pool.connect();try{
  await db.query(apply?'BEGIN':'BEGIN READ ONLY');
  if(apply)await db.query('SET LOCAL lock_timeout = \'5s\'');
  const user=(await db.query('SELECT id,email FROM lm_auth_users WHERE id=$1'+(apply?' FOR UPDATE':''),[userId])).rows[0];if(!user)throw Error('Account not found.');
  if((env.ADMIN_EMAILS||'').split(',').map(normalizeEmail).includes(normalizeEmail(user.email)))throw Error('Founder account requires separate review.');
  const ticket=(await db.query("SELECT id,status FROM lm_support_tickets WHERE id=$1 AND user_id=$2 AND subject='Privacy: deletion'",[ticketId,userId])).rows[0];if(!ticket||ticket.status!=='in_progress')throw Error('Use the verified deletion ticket for this account, marked in progress.');
  const counts={};for(const t of OWNED){const col=t==='lm_admin_audit'?'actor_user_id':'user_id';counts[t]=Number((await db.query(`SELECT count(*) AS n FROM ${t} WHERE ${col}=$1`,[userId])).rows[0].n);}
  const blockers=BILLING.filter(t=>counts[t]>0);
  // Unexpected foreign keys may introduce data losses or prevent deletion; do not guess.
  const refs=(await db.query("SELECT conrelid::regclass::text AS name FROM pg_constraint WHERE contype='f' AND confrelid IN ('lm_auth_users'::regclass,'lm_v5_animals'::regclass,'lm_farms'::regclass)")).rows.map(x=>x.name.replace(/^public\./,''));
  for(const name of refs)if(!OWNED.includes(name))blockers.push('Unexpected foreign key: '+name);
  if(apply&&blockers.length)throw Error('Blocked: '+blockers.join(', ')+'; use individually reviewed retention/cancellation workflow.');
  if(apply){const deleted=await db.query('DELETE FROM lm_auth_users WHERE id=$1 RETURNING id',[userId]);if(deleted.rowCount!==1)throw Error('Unexpected deletion count.');await db.query('COMMIT');}else await db.query('ROLLBACK');
  return {mode:apply?'applied':'dry-run',counts,blockers,remaining:'Public enquiries, provider records, device caches and backups need separate review. Send outcome to verified email and record in restricted register.'};
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{db.release();}
}
module.exports={processDeletion};
if(require.main===module){(async()=>{if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL in a restricted shell.');const args=process.argv.slice(2);if(args.length<2||args.length>3||(args[2]&&args[2]!=='--apply'))throw Error('Usage: node privacy-delete.js USER_UUID TICKET_ID [--apply]');const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL});try{console.log(JSON.stringify(await processDeletion(pool,{userId:args[0],ticketId:args[1],apply:args[2]==='--apply',env:process.env}),null,2));}finally{await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});}
