/* Livestock Manager 5.1 UX helpers. No API requests, storage writes or data mutations. */
(function(){
  'use strict';
  function init(){
    var menus=document.querySelectorAll('.lm-more-menu');
    menus.forEach(function(menu){
      menu.addEventListener('toggle',function(){
        if(!menu.open)return;
        menus.forEach(function(other){if(other!==menu)other.open=false;});
      });
    });
    document.addEventListener('click',function(e){
      menus.forEach(function(menu){if(menu.open&&!menu.contains(e.target)) menu.open=false;});
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape') menus.forEach(function(menu){menu.open=false;});
    });
    // Render a local calendar date and reflect no other state.
    var date=document.getElementById('lmToday');
    if(date){
      try{date.textContent=new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'long',year:'numeric'}).format(new Date());}
      catch(err){date.textContent='Farm overview';}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
