/* Livestock Manager v2 shared core
   Keeps the existing UI intact while adding:
   - per-user local data isolation
   - legacy-data migration
   - offline/PWA support
   - farm intelligence helpers
   - data export/import helpers
   - safer reminder handling
*/
(function () {
    "use strict";

    var nativeGet = Storage.prototype.getItem;
    var nativeSet = Storage.prototype.setItem;
    var nativeRemove = Storage.prototype.removeItem;

    var scopedKeys = {
        livestockAnimals: true,
        livestockProfiles: true,
        livestockUsers: true,
        selectedAnimalId: true,
        farmerProfile: true,
        growthRecords: true,
        healthRecords: true,
        animalHealthStatuses: true,
        livestockHealthRecords: true,
        livestockVaccinations: true,
        soldLivestock: true,
        livestockReminderSeen: true,
        farmFeedPurchases: true,
        livestockGrowth: true,
        weaningRecords: true,
        farmExpenses: true,
        farmOperations: true
    };

    function currentUserId() {
        try {
            var raw = nativeGet.call(localStorage, "currentUser");
            var user = raw ? JSON.parse(raw) : null;
            return user && user.id ? String(user.id) : "";
        } catch (e) { return ""; }
    }

    // Data belonging to a farm must use the same physical localStorage keys as
    // livestock-cloud.js. The previous per-user-only keys showed main-farm
    // animals and financial records while another farm was selected.
    var accountKeys = { livestockProfiles: true, farmerProfile: true, livestockUsers: true };
    function scopedKey(key) {
        var id = currentUserId();
        if (!id || !scopedKeys[key]) return key;
        var prefix = "lm_v2_" + id;
        if (!accountKeys[key]) {
            var farmId = window.LMFarms && window.LMFarms.getActiveId && window.LMFarms.getActiveId();
            if (farmId && farmId !== "main") prefix += "_farm_" + farmId;
        }
        return prefix + "_" + key;
    }

    function parse(raw, fallback) {
        try { return raw == null ? fallback : JSON.parse(raw); }
        catch (e) { return fallback; }
    }

    function migrateLegacy(key) {
        var id = currentUserId();
        if (!id || !scopedKeys[key] || window.LM_V5_ISOLATED) return;
        var target = scopedKey(key);
        if (window.LMFarms && window.LMFarms.getActiveId &&
            window.LMFarms.getActiveId() !== "main" && !accountKeys[key]) return;
        if (nativeGet.call(localStorage, target) !== null) return;

        var legacyRaw = nativeGet.call(localStorage, key);
        if (legacyRaw === null) return;
        var data = parse(legacyRaw, null);
        // Previously shared legacy data belongs to one browser demo account only.
        var legacyOwner = nativeGet.call(localStorage, "lm_legacy_data_owner");
        if (legacyOwner && legacyOwner !== id) return;
        if (data === null && legacyRaw !== "null") return;
        if (!legacyOwner) nativeSet.call(localStorage, "lm_legacy_data_owner", id);

        if (Array.isArray(data)) {
            data = data.map(function (item) {
                if (item && typeof item === "object" && !item.farmerId) {
                    item.farmerId = id;
                }
                return item;
            });
        }
        nativeSet.call(localStorage, target, JSON.stringify(data));
    }

    /* Transparent storage isolation. Existing page code continues to work. */
    Storage.prototype.getItem = function (key) {
        if (scopedKeys[key] && currentUserId()) {
            migrateLegacy(key);
            var item = nativeGet.call(this, scopedKey(key));
            return item === "null" ? null : item;
        }
        return nativeGet.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
        if (scopedKeys[key] && currentUserId()) {
            nativeSet.call(this, scopedKey(key), value);
            if (window.LivestockCloud && window.LivestockCloud.scheduleSync) window.LivestockCloud.scheduleSync(key);
            return;
        }
        nativeSet.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
        if (scopedKeys[key] && currentUserId()) {
            var cloudKey = window.LivestockCloud && window.LivestockCloud.isSyncedKey && window.LivestockCloud.isSyncedKey(key);
            if (cloudKey) nativeSet.call(this, scopedKey(key), "null");
            else nativeRemove.call(this, scopedKey(key));
            if (cloudKey && window.LivestockCloud.scheduleSync) window.LivestockCloud.scheduleSync(key);
            return;
        }
        nativeRemove.call(this, key);
    };

    function safeArray(key) {
        try {
            var a = JSON.parse(localStorage.getItem(key));
            return Array.isArray(a) ? a : [];
        } catch (e) { return []; }
    }

    function today() {
        var d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function daysUntil(dateValue) {
        if (!dateValue) return null;
        var d = new Date(String(dateValue).slice(0, 10) + "T00:00:00");
        if (isNaN(d.getTime())) return null;
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.round((d - t) / 86400000);
    }

    function dateFrom(value) {
        if (!value) return null;
        var d = new Date(String(value).slice(0, 10) + "T00:00:00");
        return isNaN(d.getTime()) ? null : d;
    }

    function animalName(a) { return (a && (a.name || a.tag || a.animalTag)) || "Animal"; }

    function typeOf(a) {
        return String(a && (a.type || a.species || a.animalType) || "").toLowerCase().trim();
    }

    window.LivestockCore = {
        version: "5.0-preview",
        getCurrentUser: function () {
            try { return JSON.parse(nativeGet.call(localStorage, "currentUser")) || null; }
            catch (e) { return null; }
        },
        getAnimals: function () { return safeArray("livestockAnimals"); },
        saveAnimals: function (animals) { localStorage.setItem("livestockAnimals", JSON.stringify(animals || [])); },
        getHealthRecords: function () { return safeArray("livestockHealthRecords"); },
        getVaccinations: function () { return safeArray("livestockVaccinations"); },
        getFeedPurchases: function () { return safeArray("farmFeedPurchases"); },
        getGrowthRecords: function () { return safeArray("livestockGrowth"); },
        getWeaningRecords: function () { return safeArray("weaningRecords"); },
        getSoldLivestock: function () { return safeArray("soldLivestock"); },
        getExpenses: function () { return safeArray("farmExpenses"); },
        getGestationDays: function (type) {
            var t = String(type || "").toLowerCase().trim();
            if (t === "cattle" || t === "cow" || t === "cows") return 283;
            if (t === "goat" || t === "goats") return 150;
            if (t === "sheep" || t === "ewe" || t === "ewes") return 147;
            if (t === "pig" || t === "pigs" || t === "sow" || t === "sows") return 114;
            return 0;
        },
        getWeaningDays: function (type) {
            var t = String(type || "").toLowerCase().trim();
            if (t === "cattle" || t === "cow" || t === "cows") return 205;
            if (t === "goat" || t === "goats") return 90;
            if (t === "sheep" || t === "ewe" || t === "ewes") return 90;
            if (t === "pig" || t === "pigs" || t === "sow" || t === "sows") return 28;
            return 0;
        },
        calculateBirthDate: function (type, startDate) {
            var days = this.getGestationDays(type);
            if (!days || !startDate) return "";
            var parts = String(startDate).split("-");
            if (parts.length !== 3) return "";
            var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (isNaN(d.getTime())) return "";
            d.setDate(d.getDate() + days);
            return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        },
        calculateWeaningDate: function (type, birthDate) {
            var days = this.getWeaningDays(type);
            if (!days || !birthDate) return "";
            var d = dateFrom(birthDate);
            if (!d) return "";
            d.setDate(d.getDate() + days);
            return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        },
        daysUntil: daysUntil,
        escapeHTML: function (value) {
            return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
        },
        fileToDataURL: function (file, callback) {
            if (!file) { callback(""); return; }
            if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type || "")) {
                alert("Please choose a JPG, PNG, GIF or WebP image."); callback(""); return;
            }
            var reader = new FileReader();
            reader.onerror = function () { callback(""); };
            reader.onload = function (event) {
                var original = event.target.result || "";
                // Keep new camera photos small enough for cloud record synchronization.
                // Existing saved photos are not changed or deleted.
                if (file.type === "image/gif") { callback(original); return; }
                var img = new Image();
                img.onerror = function () { callback(original); };
                img.onload = function () {
                    try {
                        var scale = Math.min(1, 1280 / Math.max(img.width || 1, img.height || 1));
                        var canvas = document.createElement("canvas");
                        canvas.width = Math.max(1, Math.round(img.width * scale));
                        canvas.height = Math.max(1, Math.round(img.height * scale));
                        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                        var reduced = canvas.toDataURL("image/jpeg", 0.78);
                        callback(reduced.length < original.length ? reduced : original);
                    } catch (_) { callback(original); }
                };
                img.src = original;
            };
            reader.readAsDataURL(file);
        },
        getToday: today,
        showToast: function (message, type) {
            var toast = document.createElement("div");
            toast.className = "lm-toast " + (type || "");
            toast.textContent = message;
            document.body.appendChild(toast);
            requestAnimationFrame(function () { toast.classList.add("show"); });
            setTimeout(function () {
                toast.classList.remove("show");
                setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
            }, 3500);
        },
        requestNotifications: function () {
            if (!("Notification" in window)) { this.showToast("Browser notifications are not supported here.", "warning"); return; }
            Notification.requestPermission().then(function (p) {
                if (p === "granted") LivestockCore.showToast("Farm notifications enabled.", "success");
                else LivestockCore.showToast("Notifications were not enabled.", "warning");
            });
        },
        getFarmIntelligence: function () {
            var animals = this.getAnimals();
            var health = this.getHealthRecords();
            var vacc = this.getVaccinations();
            var growth = this.getGrowthRecords();
            var feed = this.getFeedPurchases();
            var sold = this.getSoldLivestock();
            var expenses = this.getExpenses();
            var insights = [];
            var now = new Date();
            var thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

            animals.forEach(function (a) {
                var name = animalName(a);
                var expected = a.expectedBirthDate || a.expectedBirth || a.dueDate;
                var bd = daysUntil(expected);
                if ((a.pregnant || String(a.pregnancy || "").toLowerCase() === "pregnant") && bd !== null) {
                    if (bd < 0) insights.push({priority:"high", kind:"Pregnancy", title:"Birth overdue", text:name+" is overdue by "+Math.abs(bd)+" day(s). Inspect the animal.", date:expected});
                    else if (bd <= 7) insights.push({priority:"high", kind:"Pregnancy", title:"Birth approaching", text:name+" is expected to give birth in "+bd+" day(s).", date:expected});
                }
                if (!a.animalTag && !a.tag) insights.push({priority:"low", kind:"Record", title:"Animal identity incomplete", text:name+" does not have an animal tag/ID recorded.", date:today()});
                var born = a.birthDate || a.dateOfBirth;
                var wean = a.weaningDate || (born ? LivestockCore.calculateWeaningDate(a.type, born) : "");
                var wd = daysUntil(wean);
                if (born && wd !== null && wd >= 0 && wd <= 14) insights.push({priority:"medium", kind:"Weaning", title:"Weaning window approaching", text:name+" may be approaching its estimated weaning date.", date:wean});
            });

            health.concat(vacc).forEach(function (r) {
                var next = r.nextDate || r.nextVaccinationDate;
                var d = daysUntil(next);
                if (d === null) return;
                var name = r.animalName || r.animal || "Livestock";
                var task = r.treatment || r.vaccinationName || "Health task";
                if (d < 0) insights.push({priority:"high", kind:"Health", title:"Health task overdue", text:name+": "+task+" is overdue.", date:next});
                else if (d <= 7) insights.push({priority:"medium", kind:"Health", title:"Health task due soon", text:name+": "+task+" is due in "+d+" day(s).", date:next});
            });

            animals.forEach(function (a) {
                var relevant = growth.filter(function (g) { return String(g.animalId || g.idAnimal || "") === String(a.id); });
                if (!relevant.length) return;
                var latest = relevant.slice().sort(function (x,y) { return new Date(y.date || y.weightDate || 0) - new Date(x.date || x.weightDate || 0); })[0];
                var latestDate = dateFrom(latest.date || latest.weightDate);
                if (latestDate && latestDate < thirtyDaysAgo) insights.push({priority:"low", kind:"Growth", title:"Growth record needs updating", text:animalName(a)+" has not had a recent weight/growth record.", date:latest.date || latest.weightDate});
            });

            var feedSpend = feed.reduce(function(s,x){return s+Number(x.amount||0);},0);
            var healthSpend = health.reduce(function(s,x){return s+Number(x.amount||0);},0);
            var expenseSpend = expenses.reduce(function(s,x){return s+Number(x.amount||0);},0);
            if (feedSpend > 0 && animals.length === 0) insights.push({priority:"medium",kind:"Finance",title:"Feed purchases without active animals",text:"There are feed purchases recorded but no active animals. Check your records.",date:today()});
            if (healthSpend + expenseSpend > 0 && sold.length > 0) {
                var profits = sold.reduce(function(s,x){return s+Number(x.profitLoss||0);},0);
                if (profits < 0) insights.push({priority:"medium",kind:"Finance",title:"Sales are currently below recorded investment",text:"Review recent sold-animal costs and selling prices to identify where margins are being lost.",date:today()});
            }
            insights.sort(function(a,b){var p={high:0,medium:1,low:2};return (p[a.priority]-p[b.priority]) || ((daysUntil(a.date) || 0)-(daysUntil(b.date)||0));});
            return insights;
        },
        getAnimalIntelligence: function (animal) {
            animal = animal || {};
            var health = this.getHealthRecords().filter(function(r){ return String(r.animalId || r.idAnimal || r.animal || "") === String(animal.id); });
            var vacc = this.getVaccinations().filter(function(r){ return String(r.animalId || r.idAnimal || r.animal || "") === String(animal.id); });
            var growth = this.getGrowthRecords().filter(function(r){ return String(r.animalId || r.idAnimal || "") === String(animal.id); });
            var score = 0, reasons = [];
            if (animal.animalTag || animal.tag) { score += 10; } else reasons.push("Animal tag/ID is missing");
            if (animal.type) { score += 5; } else reasons.push("Species is missing");
            if (animal.sex) { score += 5; } else reasons.push("Sex is missing");
            if (Number(animal.weight) > 0) { score += 10; } else reasons.push("Current weight is missing");
            if (animal.inspectionDate) {
                var inspectionAge = -daysUntil(animal.inspectionDate);
                if (inspectionAge <= 30) score += 15; else if (inspectionAge <= 90) score += 8; else reasons.push("Inspection record is older than 90 days");
            } else reasons.push("No inspection date recorded");
            if (growth.length) {
                var latestGrowth = growth.slice().sort(function(a,b){ return new Date(b.date||b.weightDate||0)-new Date(a.date||a.weightDate||0); })[0];
                var gd = -daysUntil(latestGrowth.date || latestGrowth.weightDate);
                if (gd <= 30) score += 15; else if (gd <= 90) score += 7; else reasons.push("Growth record needs updating");
            } else reasons.push("No growth history recorded");
            if (health.length) {
                var latestHealth = health.slice().sort(function(a,b){ return new Date(b.date||b.recordDate||0)-new Date(a.date||a.recordDate||0); })[0];
                var hd = -daysUntil(latestHealth.date || latestHealth.recordDate);
                if (hd <= 90) score += 10; else score += 5;
            } else reasons.push("No health history recorded");
            if (vacc.length) score += 10; else reasons.push("No vaccination history recorded");
            var calves = Number(animal.calvings || animal.offspring || 0);
            if (String(animal.sex||"").toLowerCase().indexOf("female") >= 0 || animal.pregnant || calves > 0) {
                if (calves >= 1) score += 10; else if (animal.pregnant) score += 6; else reasons.push("No recorded offspring/calving history");
            }
            var investment = Number(animal.purchasePrice||0) + Number(animal.expenses||0);
            var value = Number(animal.estimatedValue||0) + Number(animal.offspringValue||0);
            if (investment > 0 && value > 0) {
                if (value >= investment) score += 10; else score += 4;
            }
            score = Math.max(0, Math.min(100, Math.round(score)));
            var band = score >= 80 ? "High" : score >= 60 ? "Moderate" : "Needs attention";
            return { score: score, band: band, reasons: reasons.slice(0,4), animalId: animal.id, name: animalName(animal) };
        },
        getFarmScore: function () {
            var animals = this.getAnimals();
            if (!animals.length) return { score: 0, band: "No data", components: {records:0, health:0, breeding:0, growth:0, finance:0}, advice:["Add your first animals to start generating farm intelligence."] };
            var total = 0, record=0, healthScore=0, breeding=0, growthScore=0, finance=0;
            var health = this.getHealthRecords(), vacc = this.getVaccinations(), growth = this.getGrowthRecords(), sold = this.getSoldLivestock(), expenses = this.getExpenses(), feed = this.getFeedPurchases();
            animals.forEach(function(a){
                var ai = LivestockCore.getAnimalIntelligence(a); total += ai.score;
                if ((a.animalTag||a.tag) && a.type && a.sex) record++;
                if (health.some(function(r){return String(r.animalId||r.idAnimal||r.animal||"")===String(a.id);}) || vacc.some(function(r){return String(r.animalId||r.idAnimal||r.animal||"")===String(a.id);})) healthScore++;
                if (Number(a.calvings||a.offspring||0)>0 || a.pregnant) breeding++;
                if (growth.some(function(r){return String(r.animalId||r.idAnimal||"")===String(a.id);})) growthScore++;
                var inv=Number(a.purchasePrice||0)+Number(a.expenses||0), val=Number(a.estimatedValue||0)+Number(a.offspringValue||0); if (!inv || !val || val>=inv) finance++;
            });
            var n=animals.length;
            var score=Math.round(total/n);
            var advice=[];
            if(record/n<0.8) advice.push("Complete animal IDs, species and sex records.");
            if(healthScore/n<0.7) advice.push("Keep health and vaccination histories up to date.");
            if(growthScore/n<0.6) advice.push("Record weights regularly so growth can be measured.");
            if(breeding/n<0.5) advice.push("Review breeding and calving records for productive females.");
            if(finance/n<0.7 && (sold.length||expenses.length||feed.length)) advice.push("Review animal costs and recorded values to improve financial visibility.");
            if(!advice.length) advice.push("Your records are in good shape. Keep updating them consistently.");
            return {score:score, band:score>=80?"Excellent":score>=65?"Good":score>=50?"Developing":"Needs attention", components:{records:Math.round(record/n*100),health:Math.round(healthScore/n*100),breeding:Math.round(breeding/n*100),growth:Math.round(growthScore/n*100),finance:Math.round(finance/n*100)}, advice:advice.slice(0,3)};
        },
        getActionSummary: function () {
            var insights=this.getFarmIntelligence();
            return {urgent:insights.filter(function(x){return x.priority==="high";}).length, attention:insights.filter(function(x){return x.priority==="medium";}).length, monitor:insights.filter(function(x){return x.priority==="low";}).length, total:insights.length, items:insights.slice(0,6)};
        },
        checkReminders: function () {
            var reminders = this.getFarmIntelligence();
            var seen = {};
            try { seen = JSON.parse(localStorage.getItem("livestockReminderSeen")) || {}; } catch (e) { seen = {}; }
            reminders.forEach(function (r, index) {
                var key = String(r.kind)+"|"+String(r.title)+"|"+String(r.text);
                if (!seen[key]) {
                    if ("Notification" in window && Notification.permission === "granted") {
                        try { new Notification(r.title, {body:r.text, tag:"lm-v2-"+index}); } catch(e) {}
                    }
                    seen[key] = new Date().toISOString();
                }
            });
            localStorage.setItem("livestockReminderSeen", JSON.stringify(seen));
            return reminders;
        },
        exportData: function () {
            var payload = {
                app: "Livestock Manager",
                version: "5.0-preview",
                exportedAt: new Date().toISOString(),
                user: this.getCurrentUser(),
                animals: this.getAnimals(),
                health: this.getHealthRecords(),
                vaccinations: this.getVaccinations(),
                feed: this.getFeedPurchases(),
                growth: this.getGrowthRecords(),
                weaning: this.getWeaningRecords(),
                sold: this.getSoldLivestock(),
                expenses: this.getExpenses()
            };
            var blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "livestock-manager-backup-" + today() + ".json";
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            this.showToast("Farm backup downloaded.", "success");
        },
        importData: function (file, callback) {
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
                try {
                    var p = JSON.parse(reader.result);
                    var mapping = {animals:"livestockAnimals",health:"livestockHealthRecords",vaccinations:"livestockVaccinations",feed:"farmFeedPurchases",growth:"livestockGrowth",weaning:"weaningRecords",sold:"soldLivestock",expenses:"farmExpenses"};
                    Object.keys(mapping).forEach(function(k){ if(Array.isArray(p[k])) localStorage.setItem(mapping[k], JSON.stringify(p[k])); });
                    if (callback) callback(true);
                    LivestockCore.showToast("Farm backup restored successfully.", "success");
                } catch(e) { if(callback) callback(false); LivestockCore.showToast("That backup file could not be read.", "warning"); }
            };
            reader.readAsText(file);
        },
        logout: async function () {
            try { if (window.LMAuth) await window.LMAuth.logout(); }
            catch (e) { if (window.LMAuth) window.LMAuth.forget(); }
            window.location.href = "login.html";
        }
    };

    function installSyncIndicator() {
        if (document.getElementById("lmSyncIndicator")) return;
        var el = document.createElement("div");
        el.id = "lmSyncIndicator";
        el.className = "lm-sync-indicator lm-sync-local";
        el.setAttribute("role","status");
        el.innerHTML = '<span class="lm-sync-dot"></span><span class="lm-sync-text">Local mode</span>';
        document.body.appendChild(el);
        function render(detail){
            var d=detail||((window.LivestockCloud&&window.LivestockCloud.getStatus)?window.LivestockCloud.getStatus():null)||{};
            el.className="lm-sync-indicator lm-sync-"+(d.state||"local");
            var text=d.message||((d.state||"local")==="synced"?"Synced":(d.state||"Local mode"));
            el.querySelector(".lm-sync-text").textContent=text;
        }
        render();
        window.addEventListener("livestock:sync",function(e){render(e.detail);});
    }

    /* Installable/offline support without changing the existing UI. */
    document.addEventListener("livestock:ready", function () {
        if ("serviceWorker" in navigator && location.protocol !== "file:") {
            navigator.serviceWorker.register("sw.js").then(function (registration) { if (registration && registration.update) registration.update(); }).catch(function () {});
        }
        LivestockCore.checkReminders();
        // Decorative sync toast intentionally removed; background sync remains active.
    });
})();
