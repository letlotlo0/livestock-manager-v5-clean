/* Registration requires email verification before first login. */
document.addEventListener('DOMContentLoaded',function(){
 const form=document.getElementById('registerForm'),message=document.getElementById('message'),button=form?.querySelector('[type="submit"]');if(!form)return;
 function show(text,type){message.textContent=text;message.className='message '+(type||'');}
 form.addEventListener('submit',async function(event){
  event.preventDefault();
  const name=document.getElementById('fullName').value.trim(),email=document.getElementById('email').value.trim(),password=document.getElementById('password').value,confirm=document.getElementById('confirmPassword').value;
  if(name.length<2)return show('Enter your full name.','error');
  if(password.length<12||password.length>128)return show('Use a password between 12 and 128 characters.','error');
  if(password!==confirm)return show('The passwords do not match.','error');
  button.disabled=true;button.textContent='Creating account…';show('Contacting the registration server…','');
  try{
   const result=await LMAuth.request('/register',{method:'POST',body:{name,email,password}});
   show(result.message||'Check your email to verify your account.','success');
   location.href='check-email.html?email='+encodeURIComponent(email);
  }catch(err){show(err.message,'error');button.disabled=false;button.textContent='Create Account';}
 });
});
