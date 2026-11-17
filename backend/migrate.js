'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
if (!process.env.DATABASE_URL) {console.error('Set DATABASE_URL before migrating.');process.exit(1);}
const pool=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{try{await pool.query(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));console.log('V5 preview tables ready.');
if(process.env.LM_V5_TEST_ONLY==='true' && process.env.TEST_FARM_EMAIL && process.env.TEST_FARM_PASSWORD){
 const {normalizeEmail,validEmail,validPassword,hashPassword}=require('./security');
 const email=normalizeEmail(process.env.TEST_FARM_EMAIL),pass=process.env.TEST_FARM_PASSWORD;
 if(!validEmail(email)||!validPassword(pass))throw new Error('Invalid TEST_FARM_EMAIL or TEST_FARM_PASSWORD (minimum 12 characters).');
 const fullName=(process.env.TEST_FARM_NAME||'V5 Test Farmer').trim();
 if(fullName.length<2||fullName.length>120)throw new Error('Invalid TEST_FARM_NAME.');
 const hashed=await hashPassword(pass);
 await pool.query("INSERT INTO lm_auth_users(full_name,email,password_hash,email_verified_at) VALUES ($1,$2,$3,now()) ON CONFLICT (email) DO NOTHING",[fullName,email,hashed]);
 console.log('V5 test account ready (existing password is not replaced).');
}}catch(e){console.error('Migration failed:',e.message);process.exitCode=1;}finally{await pool.end();}})();
