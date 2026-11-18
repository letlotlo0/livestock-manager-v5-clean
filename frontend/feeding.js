document.addEventListener("livestock:ready", function () {
    var key = "farmFeedPurchases";
    var form = document.getElementById("feedForm");
    var list = document.getElementById("feedList");
    var empty = document.getElementById("emptyState");
    var editId = null, photoData = "";

    function safePhoto(v){v=String(v||"");return /^(data:image\/(png|jpeg|gif|webp);base64,|https:\/\/|blob:)/i.test(v)?LivestockCore.escapeHTML(v):"";}

    function currentUser() {
        try { return LivestockCore.getCurrentUser ? LivestockCore.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser")); }
        catch (e) { return null; }
    }

    function readAll() {
        try {
            var raw = JSON.parse(localStorage.getItem(key));
            return Array.isArray(raw) ? raw : [];
        } catch (e) { return []; }
    }

    function get() {
        var all = readAll(), u = currentUser();
        if (!u || !u.id) return all;
        return all.filter(function (x) {
            return !x.farmerId || String(x.farmerId) === String(u.id);
        });
    }

    function save(records) {
        var u = currentUser(), all = readAll();
        if (!u || !u.id) {
            localStorage.setItem(key, JSON.stringify(records));
            return;
        }
        var others = all.filter(function (x) {
            return x.farmerId && String(x.farmerId) !== String(u.id);
        });
        localStorage.setItem(key, JSON.stringify(others.concat(records)));
    }

    function amount(v) {
        if (typeof v === "number") return isFinite(v) ? v : 0;
        var text = String(v == null ? "" : v).trim();
        if (!text) return 0;
        // Accept values such as R1 250.50, R1250, 1,250.50 or 1250.50.
        text = text.replace(/R/gi, "").replace(/\s/g, "");
        if (text.indexOf(",") !== -1 && text.indexOf(".") === -1) text = text.replace(/,/g, ".");
        else text = text.replace(/,/g, "");
        var n = Number(text.replace(/[^0-9.-]/g, ""));
        return isFinite(n) ? n : 0;
    }

    function purchaseAmount(x) {
        if (!x) return 0;
        // Keep compatibility with older feed records that used different field names.
        return amount(x.amount != null ? x.amount : (x.cost != null ? x.cost : (x.price != null ? x.price : (x.totalCost != null ? x.totalCost : x.total))));
    }

    function money(v) {
        return "R" + amount(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function date(v) {
        if (!v) return "Not recorded";
        var d = new Date(String(v).slice(0, 10) + "T00:00:00");
        return isNaN(d.getTime()) ? "Not recorded" : d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
    }

    function esc(v) { return LivestockCore.escapeHTML(v == null ? "" : String(v)); }

    var photo = document.getElementById("feedPhoto"), submit = document.getElementById("feedSubmitButton");
    // Phase 3 presentation hook: closing the editor must also clear an unfinished edit.
    window.LMFeedResetEditor = function () {
        editId = null;
        photoData = "";
        if (form) form.reset();
        if (submit) submit.textContent = "Add Feed Purchase";
        if (photo) photo.value = "";
    };
    if (photo) photo.onchange = function () {
        if (!photo.files || !photo.files[0]) return;
        LivestockCore.fileToDataURL(photo.files[0], function (x) { photoData = x || ""; });
    };

    if (form) form.onsubmit = function (e) {
        e.preventDefault();
        var a = get();
        var old = editId ? a.find(function (x) { return String(x.id) === String(editId); }) : null;
        var user = currentUser();
        var item = {
            id: editId || Date.now().toString(),
            feedType: document.getElementById("feedType").value,
            feedName: document.getElementById("feedName").value.trim(),
            quantity: amount(document.getElementById("quantity").value),
            unit: document.getElementById("unit").value,
            amount: amount(document.getElementById("amount").value),
            supplier: document.getElementById("supplier").value.trim(),
            purchaseDate: document.getElementById("purchaseDate").value,
            notes: document.getElementById("feedNotes").value.trim(),
            farmerId: (user && user.id) || (old && old.farmerId) || null,
            photo: photoData || (old && old.photo) || ""
        };
        if (item.quantity <= 0 || item.amount < 0) {
            alert("Please enter valid quantity and amount.");
            return;
        }
        var was = !!editId;
        if (editId) {
            var i = a.findIndex(function (x) { return String(x.id) === String(editId); });
            if (i >= 0) a[i] = item;
        } else a.push(item);
        save(a);
        form.reset(); editId = null; photoData = "";
        if (submit) submit.textContent = "Add Feed Purchase";
        renderAll();
        if (LivestockCore.showToast) LivestockCore.showToast(was ? "Feed purchase updated." : "Feed purchase saved.", "success");
    };

    function render() {
        if (!list || !empty) return;
        var a = get().sort(function (x, y) { return new Date(y.purchaseDate || 0) - new Date(x.purchaseDate || 0); });
        list.innerHTML = "";
        empty.style.display = a.length ? "none" : "block";
        a.forEach(function (x) {
            var c = document.createElement("div");
            c.className = "feed-card";
            c.innerHTML = '<div class="feed-top"><div class="feed-title"><div class="feed-icon">' + (safePhoto(x.photo) ? '<img src="' + safePhoto(x.photo) + '" alt="">' : '🌾') + '</div><div><h3>' + esc(x.feedName || x.feedType) + '</h3><p>' + esc(x.feedType) + '</p></div></div><strong class="feed-amount">' + money(purchaseAmount(x)) + '</strong></div>' +
                '<div class="feed-details"><div class="feed-detail"><span>QUANTITY</span><strong>' + esc(x.quantity + " " + x.unit) + '</strong></div><div class="feed-detail"><span>DATE</span><strong>' + date(x.purchaseDate) + '</strong></div><div class="feed-detail"><span>SUPPLIER</span><strong>' + esc(x.supplier || "Not recorded") + '</strong></div><div class="feed-detail"><span>NOTES</span><strong>' + esc(x.notes || "None") + '</strong></div><div class="feed-detail"><span>EXPENSE</span><strong>Farm-wide</strong></div></div>' +
                '<div class="feed-actions"><button type="button" class="action-button" data-edit="' + x.id + '">Edit</button><button type="button" class="delete-button" data-delete="' + x.id + '">Remove</button></div>';
            list.appendChild(c);
        });

        document.querySelectorAll("[data-delete]").forEach(function (b) {
            b.onclick = function () {
                if (confirm("Remove this feed purchase?")) {
                    save(get().filter(function (x) { return String(x.id) !== String(b.dataset.delete); }));
                    renderAll();
                }
            };
        });
        document.querySelectorAll("[data-edit]").forEach(function (b) {
            b.onclick = function () {
                var x = get().find(function (z) { return String(z.id) === String(b.dataset.edit); });
                if (!x) return;
                editId = x.id;
                document.getElementById("feedType").value = x.feedType || "";
                document.getElementById("feedName").value = x.feedName || "";
                document.getElementById("quantity").value = x.quantity || "";
                document.getElementById("unit").value = x.unit || "";
                document.getElementById("amount").value = x.amount || "";
                document.getElementById("supplier").value = x.supplier || "";
                document.getElementById("purchaseDate").value = x.purchaseDate || "";
                document.getElementById("feedNotes").value = x.notes || "";
                photoData = x.photo || "";
                if (submit) submit.textContent = "Save Changes";
                form.scrollIntoView({ behavior: "smooth" });
            };
        });
    }

    function totals() {
        var a = get();
        var total = a.reduce(function (s, x) { return s + purchaseAmount(x); }, 0);
        var now = new Date();
        var monthly = a.filter(function (x) {
            var d = new Date(String(x.purchaseDate || "").slice(0, 10) + "T00:00:00");
            return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce(function (s, x) { return s + purchaseAmount(x); }, 0);

        var totalEl = document.getElementById("totalFeedSpending");
        var monthlyEl = document.getElementById("monthlyFeedSpending");
        var purchasesEl = document.getElementById("totalPurchases");
        var bottomEl = document.getElementById("bottomTotal");
        if (totalEl) totalEl.textContent = money(total);
        if (monthlyEl) monthlyEl.textContent = money(monthly);
        if (purchasesEl) purchasesEl.textContent = String(a.length);
        if (bottomEl) bottomEl.textContent = money(total);
    }

    function renderAll() { render(); totals(); }
    renderAll();

    // Refresh totals when cloud sync or another tab updates farm records.
    window.addEventListener("livestock:sync", function () { setTimeout(renderAll, 50); });
    window.addEventListener("storage", function (event) {
        if (!event.key || event.key.indexOf("farmFeedPurchases") !== -1) renderAll();
    });
});
