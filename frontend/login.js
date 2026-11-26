/* Live sign-in. The server checks hashed passwords and issues a secure session cookie. */
document.addEventListener('DOMContentLoaded',function(){
 const form=document.getElementById('loginForm'),email=document.getElementById('email'),password=document.getElementById('password'),toggle=document.getElementById('togglePassword'),message=document.getElementById('loginMessage'),button=form?.querySelector('[type="submit"]');
 if(toggle)toggle.addEventListener('click',()=>{password.type=password.type==='password'?'text':'password';toggle.textContent=password.type==='password'?'Show':'Hide';});
 if(!form)return;
 // Production servers report testMode:false; then show real sign-up and password-reset links.
 fetch('/api/health',{cache:'no-store',credentials:'same-origin'}).then(r=>r.json()).then(h=>{
  const banner=document.getElementById('modeBanner'),sub=document.getElementById('loginSubtitle'),foot=document.getElementById('loginFooter');
  if(h&&h.testMode===false){
   if(banner)banner.remove();
   if(sub)sub.textContent='Sign in to manage your livestock.';
   if(foot){foot.textContent='';const f=document.createElement('a');f.href='forgot-password.html';f.textContent='Forgot your password?';const sep=document.createTextNode(' · ');const r=document.createElement('a');r.href='register.html';r.textContent='Create an account';const sep2=document.createTextNode(' · ');const s=document.createElement('a');s.href='support.html';s.textContent='Support';foot.append(f,sep,r,sep2,s);}
  }else if(h && h.testMode===true){
   if(banner)banner.textContent='New registrations are temporarily unavailable.';
   if(foot)foot.innerHTML='<a href="support.html">Need help? Contact Support</a>';
  }else{
   if(banner)banner.textContent='Account availability could not be confirmed.';
  }
 }).catch(()=>{
  const banner=document.getElementById('modeBanner');
  if(banner)banner.textContent='Unable to check account availability. Please try again.';
 });
 form.addEventListener('submit',async function(e){
  e.preventDefault();button.disabled=true;button.textContent='Signing in…';message.textContent='';message.className='login-message';
  try{
   await LMAuth.login(email.value.trim(),password.value);
   message.textContent='Signed in successfully.';message.classList.add('success');
   const next=new URLSearchParams(location.search).get('next');
   const safe=/^[a-z0-9-]+\.html$/i.test(next||'')&&!['login.html','register.html','reset-password.html'].includes(next)?next:'dashboard.html';
   location.href=safe;
  }catch(err){
   message.classList.add('error');message.textContent=err.message;
   if(err.code==='EMAIL_UNVERIFIED'){
    const link=document.createElement('a');link.href='check-email.html?email='+encodeURIComponent(email.value.trim());link.textContent='Resend verification email';message.append(' ',link);
   }
   button.disabled=false;button.textContent='Login';
  }
 });
});
