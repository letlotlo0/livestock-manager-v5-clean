'use strict';
const express=require('express');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const {
 normalizeEmail,validEmail,validName,validPassword,randomToken,digest,hashPassword,checkPassword,publicUser
}=require('./security');
const {DOCUMENT_TYPES,validDocument}=require('./farm-records');
const {installV5Routes}=require('./v5-routes');
const billing=require('./billing');
const alerts=require('./alerts');

function createApp({pool,origin,sendMail,logger=console,env=process.env,fetchImpl=globalThis.fetch,validIps}) {
  if(!pool||!origin||!sendMail) throw new Error('Missing auth server dependencies.');
  const app=express();
  const https=origin.startsWith('https://');
  const cookieName=https?'__Host-lm_session':'lm_dev_session';
  const genericEmailMessage='If this email is eligible, a message will be sent. Please check your inbox and spam folder.';
  const genericAuthError='Incorrect email or password.';
  const limit=(max,windowMs=15*60*1000)=>rateLimit({windowMs,limit:max,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many attempts. Please try again later.'}});
  const generalLimit=limit(50),loginLimit=limit(10),emailLimit=limit(5,60*60*1000);
  const cookieOptions=`Path=/; HttpOnly; SameSite=Lax${https?'; Secure':''}`;
  const setCookie=(res,token)=>res.setHeader('Set-Cookie',`${cookieName}=${encodeURIComponent(token)}; ${cookieOptions}; Max-Age=${7*24*60*60}`);
  const clearCookie=(res)=>res.setHeader('Set-Cookie',`${cookieName}=; ${cookieOptions}; Max-Age=0`);
  function cookie(req) {
    const parts=(req.headers.cookie||'').split(';');
    const item=parts.find(part=>part.trim().startsWith(cookieName+'='));
    return item?decodeURIComponent(item.trim().slice(cookieName.length+1)):null;
  }
  function fail(res,status,error){return res.status(status).json({error});}
  async function issueToken(user,purpose){
    const token=randomToken();
    await pool.query('DELETE FROM lm_auth_tokens WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL',[user.id,purpose]);
    await pool.query(`INSERT INTO lm_auth_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,now()+($4::integer * interval '1 minute'))`,[digest(token),user.id,purpose,purpose==='verify'?1440:30]);
    const url=`${origin}/${purpose==='verify'?'verify-email.html':'reset-password.html'}?token=${encodeURIComponent(token)}`;
    await sendMail({to:user.email,name:user.full_name,kind:purpose,link:url});
  }
  function asyncRoute(fn){return (req,res,next)=>Promise.resolve().then(()=>fn(req,res)).catch(next);}
  app.disable('x-powered-by');
  app.set('trust proxy',1);
  app.use(helmet({contentSecurityPolicy:false}));
  app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  app.use('/api/auth',express.json({limit:'16kb'}));
  app.use('/api/farm',express.json({limit:'7mb'}));
  app.use('/api/v5',express.json({limit:'3mb'}));
  app.use('/api/billing',express.json({limit:'4kb'}));
  app.use('/api/alerts',express.json({limit:'2kb'}));
  app.use('/api/billing/itn',express.urlencoded({extended:false,limit:'16kb'}));
  app.use('/api',(req,res,next)=>{
    // PayFast's server-to-server notification has no Origin header; it is authenticated by signature instead.
    if(req.method==='POST'&&req.path==='/billing/itn')return next();
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      // No CORS opt-in. State-changing requests must come from this exact website origin.
      if(req.headers.origin !== origin) return fail(res,403,'Request origin rejected.');
    }
    next();
  });
  // Express middleware wrapper: only proceed if authentication responded successfully.
  const requireAuth=(req,res,next)=>{
    Promise.resolve().then(async()=>{
      const session=cookie(req);
      if(!session) return fail(res,401,'Please sign in.');
      const q=await pool.query(`SELECT u.id,u.full_name,u.email,u.created_at
        FROM lm_auth_sessions s JOIN lm_auth_users u ON s.user_id=u.id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND u.email_verified_at IS NOT NULL LIMIT 1`,[digest(session)]);
      if(!q.rowCount){clearCookie(res);return fail(res,401,'Please sign in again.');}
      req.authUser=q.rows[0];req.rawSession=session;next();
    }).catch(next);
  };
  const billingCfg=billing.configFor(env);
  async function sessionUserId(req){
    const session=cookie(req);if(!session)return null;
    const q=await pool.query(`SELECT s.user_id FROM lm_auth_sessions s JOIN lm_auth_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND u.email_verified_at IS NOT NULL LIMIT 1`,[digest(session)]);
    return q.rowCount?q.rows[0].user_id:null;
  }
  // Pro-only pages: free accounts are redirected to the plans page (only applies when this service serves the frontend).
  app.get(billing.PAID_PAGE_RE,billing.pageGate(pool,billingCfg,sessionUserId));
  app.get('/api/health',asyncRoute(async(req,res)=>{await pool.query('SELECT 1');res.json({ok:true,service:'livestock-v5-preview',apiVersion:5,testMode:env.LM_V5_TEST_ONLY==='true'});}));
  app.post('/api/auth/register',generalLimit,asyncRoute(async(req,res)=>{
    if(env.LM_V5_TEST_ONLY==='true')return fail(res,403,'V5 test environment uses its seeded test account.');
    const name=String(req.body?.name||req.body?.fullName||'').trim();
    const email=normalizeEmail(req.body?.email);
    const password=req.body?.password;
    if(!validName(name)) return fail(res,400,'Enter a full name (2–120 characters).');
    if(!validEmail(email)) return fail(res,400,'Enter a valid email address.');
    if(!validPassword(password)) return fail(res,400,'Use a password between 12 and 128 characters.');
    const existing=await pool.query('SELECT id,email,full_name,email_verified_at FROM lm_auth_users WHERE email=$1 LIMIT 1',[email]);
    if(existing.rowCount) return res.status(202).json({message:genericEmailMessage});
    const hash=await hashPassword(password);
    let user;
    try{
      const ins=await pool.query('INSERT INTO lm_auth_users(full_name,email,password_hash) VALUES($1,$2,$3) RETURNING id,full_name,email',[name,email,hash]);
      user=ins.rows[0];
    }catch(e){if(e.code==='23505')return res.status(202).json({message:genericEmailMessage});throw e;}
    try{await issueToken(user,'verify');}
    catch(e){logger.error('Verification email failed:',e.message);return fail(res,503,'Account created, but email delivery failed. Please use Resend verification later.');}
    return res.status(202).json({message:'Registration received. Check your email to verify your account before logging in.'});
  }));
  app.post('/api/auth/resend-verification',emailLimit,asyncRoute(async(req,res)=>{
    const email=normalizeEmail(req.body?.email);
    if(validEmail(email)){
      const q=await pool.query('SELECT id,email,full_name FROM lm_auth_users WHERE email=$1 AND email_verified_at IS NULL',[email]);
      if(q.rowCount){try{await issueToken(q.rows[0],'verify');}catch(e){logger.error('Resend verification failed:',e.message);return fail(res,503,'Email service is unavailable right now. Please try again.');}}
    }
    return res.json({message:genericEmailMessage});
  }));
  app.post('/api/auth/verify-email',generalLimit,asyncRoute(async(req,res)=>{
    const token=String(req.body?.token||'');
    if(!/^[a-zA-Z0-9_-]{40,100}$/.test(token)) return fail(res,400,'This verification link is invalid or expired.');
    const client=await pool.connect();let user;
    try{
      await client.query('BEGIN');
      const updated=await client.query(`UPDATE lm_auth_tokens SET used_at=now()
        WHERE token_hash=$1 AND purpose='verify' AND used_at IS NULL AND expires_at>now()
        RETURNING user_id`,[digest(token)]);
      if(!updated.rowCount){await client.query('ROLLBACK');return fail(res,400,'This verification link is invalid or expired.');}
      const verified=await client.query(`UPDATE lm_auth_users SET email_verified_at=coalesce(email_verified_at,now()),updated_at=now()
        WHERE id=$1 RETURNING id,email,full_name`,[updated.rows[0].user_id]);
      user=verified.rows[0];
      await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
    finally{client.release();}
    try{await sendMail({to:user.email,name:user.full_name,kind:'welcome',link:origin+'/login.html'});}catch(e){logger.warn('Welcome email failed:',e.message);}
    return res.json({message:'Email verified. You can now log in.'});
  }));
  app.post('/api/auth/login',loginLimit,asyncRoute(async(req,res)=>{
    const email=normalizeEmail(req.body?.email),password=req.body?.password;
    if(!validEmail(email)||typeof password!=='string'||password.length>128)return fail(res,401,genericAuthError);
    const q=await pool.query('SELECT id,email,full_name,password_hash,email_verified_at,created_at FROM lm_auth_users WHERE email=$1',[email]);
    // Run the password KDF even for unknown accounts to reduce user enumeration.
    const fallback='scrypt$16384$8$1$30ca6debf04c87850aa6839a12005c7e$8b1c68b328c225c2a4fbcc7acc05823754a97e976d8d0bd48f5f04d74a12a4bfb2ea37a83c1236fb2b78dd88a05f68614f747b8e0b6d3a088b2dd3b3b1f52ab';
    const u=q.rows[0],matches=await checkPassword(password,u?u.password_hash:fallback);
    if(!u||!matches)return fail(res,401,genericAuthError);
    if(!u.email_verified_at)return res.status(403).json({code:'EMAIL_UNVERIFIED',error:'Verify your email address before logging in.'});
    const token=randomToken();
    await pool.query(`INSERT INTO lm_auth_sessions(token_hash,user_id,expires_at)
      VALUES($1,$2,now()+interval '7 days')`,[digest(token),u.id]);
    setCookie(res,token);
    return res.json({user:publicUser(u)});
  }));
  app.get('/api/auth/me',requireAuth,(req,res)=>res.json({user:publicUser(req.authUser)}));
  app.patch('/api/auth/profile',requireAuth,asyncRoute(async(req,res)=>{
    const name=String(req.body?.name||'').trim();
    if(!validName(name))return fail(res,400,'Enter a full name (2–120 characters).');
    const q=await pool.query('UPDATE lm_auth_users SET full_name=$1,updated_at=now() WHERE id=$2 RETURNING id,full_name,email,created_at',[name,req.authUser.id]);
    return res.json({user:publicUser(q.rows[0])});
  }));
  app.post('/api/auth/logout',generalLimit,asyncRoute(async(req,res)=>{
    const token=cookie(req);if(token)await pool.query('DELETE FROM lm_auth_sessions WHERE token_hash=$1',[digest(token)]);
    clearCookie(res);return res.json({ok:true});
  }));
  app.post('/api/auth/forgot-password',emailLimit,asyncRoute(async(req,res)=>{
    const email=normalizeEmail(req.body?.email);
    if(validEmail(email)){
      const q=await pool.query('SELECT id,email,full_name FROM lm_auth_users WHERE email=$1 AND email_verified_at IS NOT NULL',[email]);
      if(q.rowCount){try{await issueToken(q.rows[0],'reset');}catch(e){logger.error('Password email failed:',e.message);return fail(res,503,'Email service is unavailable right now. Please try again.');}}
    }
    return res.json({message:'If an account exists, a password reset link has been sent.'});
  }));
  app.post('/api/auth/reset-password',generalLimit,asyncRoute(async(req,res)=>{
    const token=String(req.body?.token||''),password=req.body?.password;
    if(!/^[a-zA-Z0-9_-]{40,100}$/.test(token))return fail(res,400,'This reset link is invalid or expired.');
    if(!validPassword(password))return fail(res,400,'Use a password between 12 and 128 characters.');
    const newHash=await hashPassword(password),client=await pool.connect();
    try{
      await client.query('BEGIN');
      const updated=await client.query(`UPDATE lm_auth_tokens SET used_at=now()
        WHERE token_hash=$1 AND purpose='reset' AND used_at IS NULL AND expires_at>now() RETURNING user_id`,[digest(token)]);
      if(!updated.rowCount){await client.query('ROLLBACK');return fail(res,400,'This reset link is invalid or expired.');}
      const userId=updated.rows[0].user_id;
      await client.query('UPDATE lm_auth_users SET password_hash=$1,updated_at=now() WHERE id=$2',[newHash,userId]);
      await client.query('DELETE FROM lm_auth_sessions WHERE user_id=$1',[userId]);
      await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
    finally{client.release();}
    clearCookie(res);res.json({message:'Password changed. You can now log in.'});
  }));
  // Account-owned farm documents. Every read/write is authorized from the verified
  // session cookie; a client-supplied farmerId cannot select another account.
  app.get('/api/farm/records',requireAuth,asyncRoute(async(req,res)=>{
    const q=await pool.query(`SELECT record_key,data,version,updated_at FROM lm_farm_records
      WHERE user_id=$1 ORDER BY record_key`,[req.authUser.id]);
    res.json({records:q.rows.map(row=>({key:row.record_key,data:row.data,version:Number(row.version),updatedAt:row.updated_at}))});
  }));
  app.put('/api/farm/records/:key',requireAuth,limit(240),asyncRoute(async(req,res)=>{
    const key=req.params.key;
    if(key==='livestockAnimals')return fail(res,410,'V5 animals use the individual animal API.');
    if(!Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES,key))return fail(res,400,'Unknown farm record type.');
    const expected=req.body?.expectedVersion;
    if(!Number.isSafeInteger(expected)||expected<0)return fail(res,400,'Expected version must be a non-negative integer.');
    if(!Object.prototype.hasOwnProperty.call(req.body||{},'data')||!validDocument(key,req.body.data))
      return fail(res,413,'Invalid farm record or record exceeds 6 MB. Reduce photo sizes and retry.');
    let q;
    if(expected===0){
      q=await pool.query(`INSERT INTO lm_farm_records(user_id,record_key,data,version)
        VALUES($1,$2,$3::jsonb,1) ON CONFLICT (user_id,record_key) DO NOTHING RETURNING version`,
        [req.authUser.id,key,JSON.stringify(req.body.data)]);
    } else {
      q=await pool.query(`UPDATE lm_farm_records
        SET data=$3::jsonb,version=version+1,updated_at=now()
        WHERE user_id=$1 AND record_key=$2 AND version=$4 RETURNING version`,
        [req.authUser.id,key,JSON.stringify(req.body.data),expected]);
    }
    if(!q.rowCount)return res.status(409).json({code:'SYNC_CONFLICT',error:'This record was changed on another device. Your local changes have been kept; resolve the conflict before syncing.'});
    return res.json({key,version:Number(q.rows[0].version)});
  }));
  // Plan animal limit is checked BEFORE the animal is created (falls through to the real route when allowed).
  app.post('/api/v5/animals',requireAuth,billing.animalGate(pool,billingCfg),(req,res,next)=>next());
  installV5Routes(app,{pool,requireAuth,asyncRoute,fail,limit});
  alerts.install(app,{pool,requireAuth,asyncRoute,fail,limit});
  billing.install(app,{pool,requireAuth,asyncRoute,fail,limit,cfg:billingCfg,origin,logger,fetchImpl,sendMail,...(validIps?{validIps}:{})});
  app.use('/api',(req,res)=>fail(res,404,'API route not found.'));
  app.use((err,req,res,next)=>{
    logger.error('Authentication API error:',err?.message||err);
    if(res.headersSent)return next(err);
    if(err?.type==='entity.parse.failed')return fail(res,400,'Invalid JSON request.');
    if(err?.type==='entity.too.large')return fail(res,413,'Request is too large.');
    return fail(res,500,'A server error occurred. Please try again later.');
  });
  return app;
}
module.exports={createApp};
