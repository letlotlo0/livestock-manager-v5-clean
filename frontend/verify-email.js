document.addEventListener('DOMContentLoaded',async function(){
 const message=document.getElementById('message'),token=new URLSearchParams(location.search).get('token')||'';
 history.replaceState(null,'',location.pathname);
 if(!token){message.textContent='Verification link missing. Request a new email.';message.className='message error';return;}
 message.textContent='Verifying your email…';
 try{const result=await LMAuth.request('/verify-email',{method:'POST',body:{token}});message.textContent=result.message;message.className='message success';}
 catch(err){message.textContent=err.message;message.className='message error';}
});
