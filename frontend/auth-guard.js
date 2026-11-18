/* V5: a network failure must not delete session identity or redirect users.
 * Only an actual 401 response means authentication is missing/expired.
 */
(function(){
 'use strict';
 document.documentElement.style.visibility='hidden';
 window.LMAuthReady=new Promise(resolve=>{
  document.addEventListener('DOMContentLoaded',async()=>{
   let user;
   try{user=await window.LMAuth.check();}
   catch(err){
    if(err.status===401){
     window.LMAuth.forget();
     const next=encodeURIComponent(location.pathname.split('/').pop()||'dashboard.html');
     location.replace('login.html?next='+next);
    }else{
     // Do not start livestock pages if ownership cannot be verified.
     document.body.replaceChildren();
     const outer=document.createElement('main');
     outer.style.cssText='max-width:540px;margin:12vh auto;padding:28px;font:16px/1.6 system-ui;color:#173b31;background:#f5f1e8;border-radius:16px';
     const head=document.createElement('h1');head.textContent='Cannot verify your cloud session';outer.appendChild(head);
     const detail=document.createElement('p');detail.textContent='Your connection or the test backend is unavailable. Your local animal records have not been cleared. Please reconnect and retry.';outer.appendChild(detail);
     const button=document.createElement('button');button.textContent='Retry connection';button.style.cssText='padding:10px 20px;border:0;border-radius:8px;background:#173b31;color:white;cursor:pointer';button.onclick=()=>location.reload();outer.appendChild(button);
     document.body.appendChild(outer);document.documentElement.style.visibility='';
    }
    resolve(null);return;
   }
   if(window.LivestockCloud&&window.LivestockCloud.bootstrap){
    try{await window.LivestockCloud.bootstrap(user);}
    catch(e){
     // Missing farm API must not silently fall back to the wrong farm's local data.
     console.warn('Farm management API unavailable:',e);
     document.body.replaceChildren();
     const main=document.createElement('main');
     main.style.cssText='max-width:540px;margin:12vh auto;padding:28px;font:16px/1.6 system-ui;color:#30451f;background:#f7f4ea;border-radius:16px';
     const title=document.createElement('h1');title.textContent='Farm workspace unavailable';main.appendChild(title);
     const msg=document.createElement('p');msg.textContent='The farm service could not be loaded. Confirm the Render backend includes V5.2 and the database migration has completed. Your existing records have not been deleted.';main.appendChild(msg);
     const retry=document.createElement('button');retry.textContent='Retry connection';retry.style.cssText='padding:10px 20px;border:0;border-radius:8px;background:#556b2f;color:white;cursor:pointer';retry.onclick=()=>location.reload();main.appendChild(retry);
     document.body.appendChild(main);document.documentElement.style.visibility='';resolve(null);return;
    }
   }
   document.dispatchEvent(new Event('livestock:ready'));
   document.documentElement.style.visibility='';
   resolve(user);
  },{once:true});
 });
})();
