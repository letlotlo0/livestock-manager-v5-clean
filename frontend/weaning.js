document.addEventListener("livestock:ready", function () {
    var menuButton = document.getElementById("menuButton");
    var navLinks = document.getElementById("navLinks");
    if (menuButton && navLinks) menuButton.addEventListener("click", function(){ navLinks.classList.toggle("open"); });

    var addWeaningButton = document.getElementById("addWeaningButton");
    var emptyAddButton = document.getElementById("emptyAddButton");
    var modal = document.getElementById("weaningModal");
    var closeModal = document.getElementById("closeModal");
    var cancelButton = document.getElementById("cancelButton");
    var form = document.getElementById("weaningForm");
    var animalSelect = document.getElementById("animalSelect");
    var weaningDate = document.getElementById("weaningDate");
    var weaningWeight = document.getElementById("weaningWeight");
    var weaningStatus = document.getElementById("weaningStatus");
    var weaningNotes = document.getElementById("weaningNotes");
    var recordsGrid = document.getElementById("recordsGrid");
    var emptyState = document.getElementById("emptyState");
    var totalRecords = document.getElementById("totalRecords");
    var pendingRecords = document.getElementById("pendingRecords");
    var completedRecords = document.getElementById("completedRecords");
    var averageWeight = document.getElementById("averageWeight");
    var recordCount = document.getElementById("recordCount");

    function currentUserId(){
        try { var u = window.LivestockCore && LivestockCore.getCurrentUser ? LivestockCore.getCurrentUser() : null; return u && u.id ? String(u.id) : ""; } catch(e){ return ""; }
    }
    function parseArray(key){
        try { var x=JSON.parse(localStorage.getItem(key)); return Array.isArray(x)?x:[]; } catch(e){ return []; }
    }
    function getAnimals(){ return parseArray("livestockAnimals"); }

    function getRecords(){
        var records = parseArray("weaningRecords");
        var uid = currentUserId();
        if(!uid) return records;
        return records.filter(function(r){ return !r.farmerId || String(r.farmerId)===uid; });
    }
    function saveRecords(records){
        var uid=currentUserId(), all=parseArray("weaningRecords");
        if(!uid){ localStorage.setItem("weaningRecords",JSON.stringify(records)); return; }
        all=all.filter(function(r){ return r.farmerId && String(r.farmerId)!==uid; });
        localStorage.setItem("weaningRecords",JSON.stringify(all.concat(records.map(function(r){ r.farmerId=r.farmerId||uid; return r; }))));
    }
    function populateAnimalSelect(){
        var animals=getAnimals();
        animalSelect.innerHTML='<option value="">Select animal</option>';
        animals.forEach(function(a){
            var o=document.createElement("option");
            o.value=a.id;
            o.textContent=(a.name||"Unnamed animal")+" — "+(a.tag||"No ID");
            animalSelect.appendChild(o);
        });
        var selected=localStorage.getItem("selectedAnimalId");
        if(selected && animals.some(function(a){return String(a.id)===String(selected);})) animalSelect.value=selected;
    }
    function openModal(){ populateAnimalSelect(); modal.classList.add("open"); setTimeout(function(){animalSelect.focus();},50); }
    function closeAnimalModal(){ modal.classList.remove("open"); form.reset(); }
    if(addWeaningButton)addWeaningButton.addEventListener("click",openModal);
    if(emptyAddButton)emptyAddButton.addEventListener("click",openModal);
    if(closeModal)closeModal.addEventListener("click",closeAnimalModal);
    if(cancelButton)cancelButton.addEventListener("click",closeAnimalModal);
    if(modal)modal.addEventListener("click",function(e){if(e.target===modal)closeAnimalModal();});

    function findAnimal(id){ return getAnimals().find(function(a){return String(a.id)===String(id);}); }
    function icon(type){
        type=String(type||"").toLowerCase();
        return type==="cattle"||type==="cow" ? "🐄" : type==="goat" ? "🐐" : type==="sheep" ? "🐑" : type==="pig" ? "🐖" : "🐾";
    }
    function esc(v){
        if(window.LivestockCore && LivestockCore.escapeHTML) return LivestockCore.escapeHTML(v);
        return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    }
    function formatDate(v){
        if(!v)return"Not recorded";
        var d=new Date(v+"T00:00:00");
        return isNaN(d)?"Not recorded":d.toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"});
    }
    function cap(v){return v?String(v).charAt(0).toUpperCase()+String(v).slice(1):"";}

    form.addEventListener("submit",function(e){
        e.preventDefault();
        if(!animalSelect.value || !weaningDate.value || !weaningWeight.value){ alert("Please complete the animal, date and weight."); return; }
        var records=getRecords(), uid=currentUserId();
        records.push({
            id:Date.now().toString(),
            animalId:animalSelect.value,
            date:weaningDate.value,
            weight:Number(weaningWeight.value),
            status:weaningStatus.value,
            notes:weaningNotes.value.trim(),
            farmerId:uid||null,
            createdAt:new Date().toISOString()
        });
        saveRecords(records); closeAnimalModal(); renderRecords(); updateSummary();
        if(window.LivestockCore && LivestockCore.showToast) LivestockCore.showToast("Weaning record saved.","success");
    });

    function renderRecords(){
        var records=getRecords().sort(function(a,b){return new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt);});
        recordsGrid.innerHTML="";
        recordCount.textContent=records.length+(records.length===1?" record":" records");
        if(!records.length){recordsGrid.style.display="none";emptyState.style.display="block";return;}
        recordsGrid.style.display="grid"; emptyState.style.display="none";
        records.forEach(function(r){
            var animal=findAnimal(r.animalId);
            var animalName=animal ? (animal.name||"Unnamed animal") : (r.animalName||"Animal record");
            var tag=animal ? (animal.tag||"No ID") : (r.animalTag||"Animal no longer in current list");
            var breed=animal ? (animal.breed||"Unknown breed") : (r.breed||"Unknown breed");
            var card=document.createElement("article"); card.className="record-card";
            card.innerHTML='<div class="record-top"><div class="record-animal"><div class="record-icon">'+icon(animal&&animal.type)+'</div><div><h3>'+esc(animalName)+'</h3><p>'+esc(tag)+' • '+esc(breed)+'</p></div></div><span class="status-badge '+(r.status==="weaned"?"weaned":"pending")+'">'+cap(r.status||"pending")+'</span></div>'+
            '<div class="record-details"><div class="detail"><span>WEANING DATE</span><strong>'+formatDate(r.date)+'</strong></div><div class="detail"><span>WEANING WEIGHT</span><strong>'+Number(r.weight||0).toFixed(1)+' kg</strong></div><div class="detail"><span>ANIMAL TYPE</span><strong>'+esc(animal&&animal.type||"Not recorded")+'</strong></div><div class="detail"><span>RECORDED</span><strong>'+formatDate((r.createdAt||"").slice(0,10))+'</strong></div></div>'+
            (r.notes?'<div class="record-notes"><strong>Notes:</strong> '+esc(r.notes)+'</div>':"")+
            '<div class="record-actions"><button type="button" class="delete-record" data-id="'+esc(r.id)+'">Delete</button></div>';
            recordsGrid.appendChild(card);
        });
        recordsGrid.querySelectorAll(".delete-record").forEach(function(btn){
            btn.addEventListener("click",function(){
                if(!confirm("Delete this weaning record?"))return;
                saveRecords(getRecords().filter(function(r){return String(r.id)!==String(btn.dataset.id);}));
                renderRecords(); updateSummary();
            });
        });
    }
    function updateSummary(){
        var records=getRecords(), pending=0, done=0, total=0, count=0;
        records.forEach(function(r){if(r.status==="pending")pending++;if(r.status==="weaned")done++;var w=Number(r.weight);if(isFinite(w)&&w>0){total+=w;count++;}});
        totalRecords.textContent=records.length; pendingRecords.textContent=pending; completedRecords.textContent=done;
        averageWeight.textContent=(count?total/count:0).toFixed(1)+" kg";
    }
    populateAnimalSelect(); renderRecords(); updateSummary();
});