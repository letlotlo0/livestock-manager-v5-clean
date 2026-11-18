/* Plans, limits and PayFast checkout. The SERVER decides access and limits; this file only displays them
 * and gives friendly early warnings. Payment is confirmed by PayFast's server notification, never by the browser. */
(function () {
  "use strict";
  var state = { status: null };
  var PAGE_LABELS = { "growth": "Growth", "weaning": "Weaning", "vaccinations": "Vaccinations", "family-tree": "Family Tree", "operations": "Operations", "money-stats": "Money Stats", "farm-reports": "Reports", "animal-profile": "Animal Profile", "digital-pedigree": "Digital Pedigree" };
  var UNLIMITED = Number.MAX_SAFE_INTEGER;

  function api(path, options) {
    return fetch("/api/billing" + path, Object.assign({ credentials: "same-origin", cache: "no-store" }, options)).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || "Request failed. Please try again."); e.status = r.status; e.code = d.code; throw e; }
        return d;
      });
    });
  }
  function current() { return state.status && state.status.entitlement; }
  function limitOf() { var e = current(); return !e || e.animalLimit === null ? UNLIMITED : e.animalLimit; }
  function getCount() { if(state.status && Number.isFinite(Number(state.status.animalCount))) return Number(state.status.animalCount); try { var a = JSON.parse(localStorage.getItem("livestockAnimals") || "[]"); return Array.isArray(a) ? a.length : 0; } catch (e) { return 0; } }
  function post(planId) {
    return api("/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId }) }).then(function (c) {
      var form = document.createElement("form");
      form.method = "POST"; form.action = c.action;
      c.fields.forEach(function (f) { var i = document.createElement("input"); i.type = "hidden"; i.name = f.name; i.value = f.value; form.appendChild(i); });
      document.body.appendChild(form); form.submit();
    });
  }
  var api_ = {
    status: function () { return state.status; },
    load: function () { return api("/status").then(function (s) { state.status = s; return s; }).catch(function () { return null; }); },
    getSubscription: function () { return state.status; },
    getPlan: function () { var e = current(); return { id: e ? e.plan : "free", name: e ? e.planName : "Free", animalLimit: limitOf() }; },
    effectivePlan: function () { var e = current(); return e ? e.plan : "free"; },
    hasFeature: function () { var e = current(); return !e || e.allPages; },
    canAddAnimal: function (count) { return (typeof count === "number" ? count : getCount()) < limitOf(); },
    getAnimalsCount: getCount, isReady: function () { return true; }, enforce: function () {}, checkout: post
  };
  window.LivestockSubscription = api_;
  api_.load(); // warm the cache so the animal limit warning works on every page

  var root = document.getElementById("billingRoot");
  if (!root) return;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function date(iso) { try { return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function rand(v) { return "R" + Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  var FEATURES = {
    free: ["Up to 25 animals", "Home, Animals, Overview, Feeding, Health, Alerts and Profile", "Email and in-app alerts"],
    pro: ["Up to 150 animals", "Every page: Growth, Weaning, Vaccinations, Family Tree, Operations, Money Stats and Reports", "Email and in-app alerts"],
    proplus: ["Unlimited animals", "Every page", "Email and in-app alerts"]
  };
  var ORDER = { free: 0, pro: 1, proplus: 2 };

  function render(s, message) {
    root.textContent = "";
    var e = s.entitlement;
    if (!s.enforced) { root.appendChild(el("div", "billing-status", "Plans are switched off on this server. All features and unlimited animals are available.")); return; }
    var locked = new URLSearchParams(location.search).get("locked");
    if (locked && PAGE_LABELS[locked] && !e.allPages) root.appendChild(el("div", "billing-status warn", PAGE_LABELS[locked] + " is available on the Pro and Pro+ plans. Choose a plan below to unlock it."));

    var limitText = e.animalLimit === null ? "unlimited animals" : s.animalCount + " of " + e.animalLimit + " animals used";
    var text = "Your plan: " + e.planName + " (" + limitText + ").";
    var warn = false;
    if (e.state === "paid" && e.cancelAtPeriodEnd) { text += " Cancelled. You keep " + e.planName + " until " + date(e.periodEnd) + ", then move to Free."; warn = true; }
    else if (e.state === "paid" && e.status === "past_due") { text += " Your last payment did not go through. Please update your payment method with PayFast to keep " + e.planName + "."; warn = true; }
    else if (e.state === "paid") text += " Renews around " + date(e.periodEnd) + ".";
    else if (e.lapsed) { text += " Your paid plan has ended. Your data is safe."; warn = true; }
    root.appendChild(el("div", "billing-status" + (warn ? " warn" : ""), text));
    if (e.animalLimit !== null && s.animalCount > e.animalLimit) root.appendChild(el("div", "billing-status warn", "You have " + s.animalCount + " animals but your plan allows " + e.animalLimit + ". Your animals are all kept, but you cannot add more until you upgrade or remove some."));
    if (message) root.appendChild(el("div", "billing-status", message));

    var grid = el("div", "billing-plans");
    s.plans.forEach(function (p) {
      var isCurrent = e.plan === p.id && !(e.state === "paid" && e.cancelAtPeriodEnd);
      var card = el("div", "billing-plan" + (isCurrent ? " current" : "") + (p.id === "pro" ? " popular" : ""));
      if (isCurrent) card.appendChild(el("span", "billing-badge", "Current plan"));
      card.appendChild(el("h2", "", p.name));
      var price = el("div", "billing-price", p.paid ? rand(p.amount) : "R0"); price.appendChild(el("small", "", " " + (p.paid ? p.label : "forever"))); card.appendChild(price);
      var ul = el("ul", "billing-features");
      (FEATURES[p.id] || []).forEach(function (f) { ul.appendChild(el("li", "", f)); });
      card.appendChild(ul);
      if (p.paid) {
        var verb = ORDER[p.id] > ORDER[e.plan] ? "Upgrade to " : "Switch to ";
        var b = el("button", "billing-btn", isCurrent ? "Current plan" : verb + p.name); b.type = "button"; b.disabled = isCurrent || !s.ready;
        b.onclick = function () {
          if (e.state === "paid" && !e.cancelAtPeriodEnd && !confirm("This starts a new " + p.name + " subscription and cancels your current " + e.planName + " subscription. Continue?")) return;
          b.disabled = true; b.textContent = "Taking you to PayFast…";
          post(p.id).catch(function (err) { render(s, err.message); });
        };
        card.appendChild(b);
      } else if (isCurrent) card.appendChild(el("p", "billing-note", "No payment needed."));
      else card.appendChild(el("p", "billing-note", "Cancel your paid plan below to return to Free."));
      grid.appendChild(card);
    });
    root.appendChild(grid);
    if (!s.ready) root.appendChild(el("p", "billing-error", "Payments are not available yet. Please check back soon."));
    if (s.sandbox) root.appendChild(el("p", "billing-note", "Test mode: no real money is charged."));

    if (e.state === "paid" && !e.cancelAtPeriodEnd && e.status === "active") {
      var c = el("button", "billing-btn secondary", "Cancel subscription"); c.type = "button";
      c.onclick = function () {
        if (!confirm("Cancel your subscription? You keep your paid plan until the end of the period you have paid for, then move to Free.")) return;
        c.disabled = true;
        api("/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function () { return refresh("Subscription cancelled."); }).catch(function (err) { c.disabled = false; render(s, err.message); });
      };
      root.appendChild(c);
    }
    root.appendChild(el("p", "billing-note", "Prices are in South African rand and billed monthly. Payments are processed securely by PayFast; we never see or store your card details."));
  }
  function refresh(message) { return api_.load().then(function (s) { if (s) render(s, message); else root.textContent = "Could not load your plan. Please reload."; return s; }); }

  var returned = new URLSearchParams(location.search).get("payment");
  (window.LMAuthReady || Promise.resolve()).then(function () {
    if (returned === "success") {
      var tries = 0;
      (function poll() {
        refresh("Thank you. We are confirming your payment with PayFast…").then(function (s) {
          if (s && s.entitlement.state === "paid" && s.entitlement.status === "active") { render(s, "Payment confirmed. Your new plan is active!"); return; }
          if (++tries < 20) setTimeout(poll, 3000); else render(s, "Your payment is still being confirmed. This can take a few minutes; refresh this page shortly.");
        });
      })();
    } else refresh(returned === "cancelled" ? "Payment was cancelled. You have not been charged." : undefined);
  });
})();
