document.addEventListener('DOMContentLoaded',function(){
 const form=document.getElementById('resendForm'),email=document.getElementById('email'),message=document.getElementById('message'),button=form?.querySelector('[type="submit"]');
 email.value=new URLSearchParams(location.search).get('email')||'';
 history.replaceState(null,'',location.pathname);
 form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;message.textContent='Sending…';message.className='message';
  try{const data=await LMAuth.request('/resend-verification',{method:'POST',body:{email:email.value.trim()}});message.textContent=data.message;message.className='message success';}
  catch(err){message.textContent=err.message;message.className='message error';}finally{button.disabled=false;}
 });
});
