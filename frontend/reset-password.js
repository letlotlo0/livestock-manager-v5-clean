document.addEventListener('DOMContentLoaded',function(){
 const form=document.getElementById('resetForm'),msg=document.getElementById('message'),button=form?.querySelector('button[type="submit"]');if(!form)return;
 const token=new URLSearchParams(location.search).get('token')||'';
 history.replaceState(null,'',location.pathname);
 if(!token){msg.className='message error';msg.textContent='This reset link is missing or invalid. Request a new one.';button.disabled=true;return;}
 form.addEventListener('submit',async function(e){
  e.preventDefault();const password=document.getElementById('password').value,confirm=document.getElementById('confirm').value;
  if(password.length<12||password.length>128||password!==confirm){msg.className='message error';msg.textContent='Use matching passwords of 12–128 characters.';return;}
  button.disabled=true;msg.textContent='Updating your password…';msg.className='message';
  try{const out=await LMAuth.request('/reset-password',{method:'POST',body:{token,password}});msg.textContent=out.message;msg.className='message success';form.reset();}
  catch(err){msg.textContent=err.message;msg.className='message error';button.disabled=false;}
 });
});
