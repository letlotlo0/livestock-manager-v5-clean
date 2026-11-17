document.addEventListener('DOMContentLoaded',function(){
 const form=document.getElementById('forgotForm'),msg=document.getElementById('message'),button=form?.querySelector('button[type="submit"]');if(!form)return;
 form.addEventListener('submit',async function(e){
  e.preventDefault();button.disabled=true;msg.className='message';msg.textContent='Sending your request…';
  try{const out=await LMAuth.request('/forgot-password',{method:'POST',body:{email:document.getElementById('email').value.trim()}});msg.className='message success';msg.textContent=out.message;}
  catch(err){msg.className='message error';msg.textContent=err.message;}
  finally{button.disabled=false;}
 });
});
