"use strict";
/* Livestock Manager AI Farm Assistant: account-level Pro+ entitlement from verified subscription.
 * No secrets in client code, no farm records sent automatically, no cross-account access.
 */
const {loadEntitlement}=require('./billing');
const {configFor}=require('./billing');
const MAX_MESSAGE=1200;
const instructions=`You are Livestock Manager's AI Farm Assistant for South African farmers. Be concise, practical and clear. Provide educational guidance on herd records, breeding schedules, feeding and farm budgeting. You have NOT been given farm records, individual animal histories, live weather, or current veterinary information. Never pretend you can see them. You must not diagnose animals, prescribe veterinary medications, dosages or withdrawal periods; encourage a qualified veterinarian for illness, emergencies, and treatment decisions. Never invent farm profitability or market prices. When asked for calculations, state assumptions. You do not execute app actions.`;
async function proplus(pool,cfg,userId){
  // Force actual paid-subscription evaluation even when general BILLING_ENFORCED=false.
  const entitlement=await loadEntitlement(pool,{...cfg,enforced:true},userId);
  return entitlement.plan==='proplus' && entitlement.state==='paid';
}
function readText(body){
  const messages=(Array.isArray(body?.history)?body.history:[]).slice(-6);
  const input=[];
  for(const m of messages){if(!m || !['user','assistant'].includes(m.role)||typeof m.content!=='string')continue;
    input.push({role:m.role,content:m.content.slice(0,MAX_MESSAGE)});}
  const q=typeof body?.message==='string'?body.message.trim():'';
  if(!q||q.length>MAX_MESSAGE)return null;
  input.push({role:'user',content:q});return input;
}
function installAiAssistant(app,{pool,requireAuth,asyncRoute,limit,env=process.env,fetchImpl=globalThis.fetch,logger=console}){
  const cfg=configFor(env);
  const enabled=()=>env.AI_ASSISTANT_ENABLED==='true'&&Boolean(env.OPENAI_API_KEY);
  app.get('/api/ai/status',requireAuth,asyncRoute(async(req,res)=>{
    res.json({eligible:await proplus(pool,cfg,req.authUser.id),available:enabled()});
  }));
  app.post('/api/ai/chat',requireAuth,limit(12,60*60*1000),asyncRoute(async(req,res)=>{
    if(!await proplus(pool,cfg,req.authUser.id))return res.status(403).json({error:'AI Farm Assistant is available with an active Pro+ subscription.'});
    if(!enabled())return res.status(503).json({error:'AI Farm Assistant is not available yet. Please try again later.'});
    const input=readText(req.body);
    if(!input)return res.status(400).json({error:'Ask a question of up to 1,200 characters.'});
    try{
      const upstream=await fetchImpl('https://api.openai.com/v1/responses',{
        method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5.4-mini',store:false,instructions,input,max_output_tokens:450}),
        signal:AbortSignal.timeout(25000)
      });
      if(!upstream.ok){logger.warn('AI provider error',upstream.status);return res.status(502).json({error:'AI service is temporarily unavailable.'});}
      const payload=await upstream.json();
      const text=(payload.output||[]).flatMap(x=>x.type==='message'?(x.content||[]):[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
      if(!text)return res.status(502).json({error:'AI did not return a usable reply.'});
      return res.json({answer:text.slice(0,4500)});
    }catch(e){logger.warn('AI call failed',e.name||'Error');return res.status(502).json({error:'AI service could not respond. Please try again.'});}
  }));
}
module.exports={installAiAssistant,proplus,readText};
