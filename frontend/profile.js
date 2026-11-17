document.addEventListener("livestock:ready",function(){
    var menu=document.getElementById("menuButton"),nav=document.getElementById("navLinks"); if(menu&&nav)menu.onclick=function(){nav.classList.toggle("open");};
    var edit=document.getElementById("editButton"),modal=document.getElementById("profileModal"),close=document.getElementById("closeModal"),cancel=document.getElementById("cancelButton"),form=document.getElementById("profileForm"),imageInput=document.getElementById("profileImageInput"),pic=document.getElementById("profilePicture"),logout=document.getElementById("logoutButton");
    var currentUser=getCurrentUser(); if(!currentUser){window.location.href="login.html";return;}
    function getCurrentUser(){try{return JSON.parse(localStorage.getItem("currentUser"))||null;}catch(e){return null;}}
    function getProfiles(){try{var p=JSON.parse(localStorage.getItem("livestockProfiles"));return Array.isArray(p)?p:[];}catch(e){return[];}}
    function getProfile(){var profiles=getProfiles(),id=localStorage.getItem("currentProfileId")||currentUser.id;return profiles.find(function(p){return String(p.id)===String(id);})||currentUser;}
    function saveProfile(profile){var profiles=getProfiles(),i=profiles.findIndex(function(p){return String(p.id)===String(profile.id);});if(i<0)profiles.push(profile);else profiles[i]=profile;localStorage.setItem("livestockProfiles",JSON.stringify(profiles));var users=[];try{users=JSON.parse(localStorage.getItem("livestockUsers"))||[];}catch(e){users=[];}var u=users.findIndex(function(x){return String(x.id)===String(profile.id);});if(u>=0)users[u]=profile;else users.push(profile);localStorage.setItem("livestockUsers",JSON.stringify(users));localStorage.setItem("currentUser",JSON.stringify(profile));}
    var nameInput=document.getElementById("farmerName"),emailInput=document.getElementById("farmerEmail"),phoneInput=document.getElementById("farmerPhone"),farmInput=document.getElementById("farmName"),locInput=document.getElementById("farmLocation"),mapInput=document.getElementById("mapLocation");
    function safePhoto(v){v=String(v||"");return /^(data:image\/(png|jpeg|gif|webp);base64,|https:\/\/|blob:)/i.test(v)?LivestockCore.escapeHTML(v):"";}

    function display(){var p=getProfile();document.getElementById("displayName").textContent=p.fullName||p.name||"Your Name";document.getElementById("displayFarm").textContent=p.farmName||"Your Farm";document.getElementById("infoName").textContent=p.fullName||p.name||"Not provided";document.getElementById("infoEmail").textContent=p.email||"Not provided";document.getElementById("infoPhone").textContent=p.phone||"Not provided";document.getElementById("infoFarm").textContent=p.farmName||"Not provided";document.getElementById("infoLocation").textContent=p.location||"Not provided";var un=document.getElementById("infoUsername"),cr=document.getElementById("infoCreated");if(un)un.textContent=p.username||"Not provided";if(cr)cr.textContent=p.createdAt?new Date(p.createdAt).toLocaleDateString("en-ZA"):"Not provided";if(mapLink){if(/^https:\/\//i.test(p.mapLink||"")){mapLink.href=p.mapLink;mapLink.style.display="inline";}else if(p.location){mapLink.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.location);mapLink.style.display="inline";}else mapLink.style.display="none";}pic.innerHTML=safePhoto(p.image)?'<img src="'+safePhoto(p.image)+'" alt="Farmer profile picture">':'👨‍🌾';}
    var mapLink=document.getElementById("mapLink");
    function open(){var p=getProfile();nameInput.value=p.fullName||p.name||"";emailInput.value=currentUser.email||p.email||"";emailInput.readOnly=true;emailInput.title="Email changes require a verified change-email flow, which will be added separately.";phoneInput.value=p.phone||"";farmInput.value=p.farmName||"";locInput.value=p.location||"";mapInput.value=p.mapLink||"";modal.classList.add("open");}
    function shut(){modal.classList.remove("open");}
    if(edit)edit.onclick=open;if(close)close.onclick=shut;if(cancel)cancel.onclick=shut;if(modal)modal.onclick=function(e){if(e.target===modal)shut();};
    if(imageInput)imageInput.onchange=function(){var f=imageInput.files[0];if(!f)return;if(f.type.indexOf("image/")!==0){alert("Please select an image file.");return;}LivestockCore.fileToDataURL(f,function(data){if(!data)return;var p=getProfile();p.image=data;saveProfile(p);display();});};
    if(form)form.onsubmit=async function(e){e.preventDefault();var p=getProfile();p.fullName=nameInput.value.trim();p.name=p.fullName;p.email=currentUser.email;p.phone=phoneInput.value.trim();p.farmName=farmInput.value.trim();p.location=locInput.value.trim();p.mapLink=mapInput.value.trim();try { const outcome=await LMAuth.request('/profile',{method:'PATCH',body:{name:p.fullName}});p.name=outcome.user.name;p.fullName=outcome.user.fullName;p.email=outcome.user.email; }catch(err){alert(err.message||"Could not update your account. Please retry.");return;}
    saveProfile(p);currentUser=p;display();shut();alert("Profile saved successfully.");};
    if(logout)logout.onclick=async function(){if(confirm("Log out of Livestock Manager?")){try{await LMAuth.logout();}catch(err){LMAuth.forget();}window.location.href="login.html";}};
    // Keep the existing profile layout while adding one useful backup action.
    if(logout&&window.LivestockCloud&&LivestockCloud.downloadBackup){
      var backup=document.createElement("button");backup.type="button";
      backup.className=logout.className;backup.textContent="Download Farm Backup";
      backup.style.marginRight="10px";
      backup.onclick=function(){LivestockCloud.downloadBackup();};
      logout.parentNode.insertBefore(backup,logout);
    }
    display();
});
