/* Live Livestock Manager accounts. Session credentials are HttpOnly cookies, never localStorage. */
(function(){
 'use strict';
 const base='/api/auth';
 async function request(path,{method='GET',body}={}){
  let response;
  try {response=await fetch(base+path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});}
  catch(_){throw new Error('Could not contact Livestock Manager. Please check your connection and website setup.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(data.error||'Request failed. Please try again.');e.status=response.status;e.code=data.code;throw e;}
  return data;
 }
 function remember(user){
  if(!user||!user.id)throw new Error('Missing account identity.');
  const identity={id:user.id,name:user.name,fullName:user.fullName||user.name,email:user.email,createdAt:user.createdAt,emailVerified:true};
  localStorage.setItem('currentUser',JSON.stringify(identity));
  localStorage.setItem('currentProfileId',String(identity.id));
  localStorage.setItem('isLoggedIn','true');
  localStorage.removeItem('lm_demo_session');
  return identity;
 }
 function forget(){localStorage.removeItem('currentUser');localStorage.removeItem('currentProfileId');localStorage.removeItem('lm_demo_session');localStorage.setItem('isLoggedIn','false');}
 async function login(email,password){const data=await request('/login',{method:'POST',body:{email,password}});remember(data.user);return data.user;}
 async function check(){const data=await request('/me');remember(data.user);return data.user;}
 async function logout(){try{await request('/logout',{method:'POST'});}finally{forget();}}
 window.LMAuth={request,remember,forget,login,check,logout};
})();
