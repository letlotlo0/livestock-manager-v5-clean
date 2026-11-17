'use strict';
const path = require('node:path');
const {Pool}=require('pg');
const {createApp}=require('./app');
const {createSender}=require('./email');
const testMode = process.env.LM_V5_TEST_ONLY === 'true';
if (testMode && (!process.env.TEST_FARM_EMAIL || !process.env.TEST_FARM_PASSWORD)) {console.error('Set TEST_FARM_EMAIL and TEST_FARM_PASSWORD for the test preview.');process.exit(1);}
if (!process.env.DATABASE_URL || !process.env.APP_ORIGIN || !/^https?:\/\//.test(process.env.APP_ORIGIN)) {
  console.error('DATABASE_URL and a valid APP_ORIGIN must be configured.');process.exit(1);
}
if (!testMode && process.env.NODE_ENV !== 'development') {
  // Production: real sign-ups need verification email, and billing needs PayFast credentials.
  const missing=['RESEND_API_KEY','MAIL_FROM'].filter(k=>!process.env[k]);
  if (process.env.BILLING_ENFORCED === 'true') missing.push(...['PAYFAST_MERCHANT_ID','PAYFAST_MERCHANT_KEY','PAYFAST_PASSPHRASE'].filter(k=>!process.env[k]));
  if (!process.env.APP_ORIGIN.startsWith('https://')) missing.push('APP_ORIGIN (must be https://)');
  if (missing.length) {console.error('Production mode is missing: '+missing.join(', '));process.exit(1);}
}
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const app=createApp({pool,origin:process.env.APP_ORIGIN.replace(/\/$/,''),sendMail:createSender()});
// You can serve the complete frontend from Render, or host it on Netlify with an /api proxy.
if (process.env.SERVE_FRONTEND === 'true') {
  const express=require('express');
  const root=path.resolve(__dirname,'..','frontend');
  app.use(express.static(root,{index:'index.html',dotfiles:'deny',extensions:['html']}));
}
if(!testMode&&process.env.ALERT_EMAILS!=='false'){require('./alerts').startScheduler({pool,sendMail:createSender(),origin:process.env.APP_ORIGIN.replace(/\/$/,'')});}
const port=Number(process.env.PORT||10000);
app.listen(port,'0.0.0.0',()=>console.log('Livestock Manager authentication API listening on '+port));
