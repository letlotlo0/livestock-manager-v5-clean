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
    hasFeature: function (name) { var e = current(); if(!e)return false; if(!name)return !!e.allPages; return !!(e.features && e.features[name]); },
    canAddAnimal: function (count) { return (typeof count === "number" ? count : getCount()) < limitOf(); },
    getAnimalsCount: getCount, isReady: function () { return true; }, enforce: function () {}, checkout: post
  };
  window.LivestockSubscription = api_;
  api_.load(); // warm the cache so the animal limit warning works on every page

  var root = document.getElementById("billingRoot");
  if (!root) return;
  function el(tag, cls, content) {
    var n = document.createElement(tag); if (cls) n.className = cls;
    if (content !== undefined) n.textContent = content;
    return n;
  }
  function add(parent, tag, cls, content) { var n = el(tag, cls, content); parent.appendChild(n); return n; }
  function date(iso) { try { return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function rand(v) { return "R" + Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  var ORDER = { free: 0, pro: 1, proplus: 2 };
  // These are the approved UPCOMING packages. The live backend still decides actual access.
  var PREVIEW = {
    free: {
      kicker: "THE ESSENTIALS", tagline: "Get your herd organised and keep the important records together.",
      tag: "Start here", capacity: ["25 animals", "1 farm"],
      features: ["Animal registration and herd history", "Basic health and vaccination records", "Basic breeding and weight records", "Cloud sync and raw data export"],
      excludes: "Advanced financial PDF and multi-farm tools"
    },
    pro: {
      kicker: "HERD MANAGEMENT", tagline: "Everything your single-farm operation needs to work smarter.",
      tag: "One farm, more control", capacity: ["100 animals", "1 farm"],
      features: ["Detailed animal, breeding and birth records", "Growth tracking and day-to-day operations", "Sales, expenses and financial summaries", "Advanced financial PDF reports", "Health history, cloud sync and data export"],
      excludes: "Multi-farm management and portfolio reports"
    },
    proplus: {
      kicker: "FARM INTELLIGENCE", tagline: "See the bigger picture across multiple farms and herds.",
      tag: "Most capability", capacity: ["Unlimited animals*", "Up to 3 farms"],
      features: ["Everything in Pro, including financial PDFs", "Multi-farm switching and portfolio reports", "Cross-farm financial comparisons", "Advanced pedigree and stud insights", "Advanced herd and performance analysis"],
      excludes: "*Fair-use and technical safeguards may apply"
    }
  };
  var COMPARE_ROWS = [
    ["Animal capacity", "25", "100", "Unlimited*"],
    ["Farm workspaces", "1", "1", "Up to 3"],
    ["Health history and raw exports", "✓", "✓", "✓"],
    ["Breeding and growth", "Basic", "Full", "Advanced"],
    ["Advanced farm financial PDFs", "—", "✓", "✓"],
    ["Portfolio PDF and farm comparisons", "—", "—", "✓"],
    ["Advanced pedigree and stud analysis", "—", "—", "✓"]
  ];
  function renderStatus(s, e) {
    var panel = add(root, "section", "lm-pricing-account");
    var intro = add(panel, "div");
    add(intro, "span", "lm-pricing-account-label", "Your current subscription");
    add(intro, "div", "lm-pricing-account-title", e.planName || "Free");
    var actualLimit = e.animalLimit === null ? "unlimited" : e.animalLimit;
    var msg = (Number(s.animalCount) || 0) + " animals recorded · Current server allowance: " + actualLimit + ".";
    if (e.state === "paid" && e.cancelAtPeriodEnd) msg += " Cancels at period end: " + date(e.periodEnd) + ".";
    else if (e.state === "paid" && e.status === "past_due") msg += " Payment overdue; check your billing details.";
    else if (e.state === "paid" && e.periodEnd) msg += " Next billing period: " + date(e.periodEnd) + ".";
    else if (e.lapsed) msg += " Your paid plan has ended; stored data is retained.";
    add(intro, "div", "lm-pricing-account-summary", msg);
    if (e.animalLimit !== null && e.animalLimit > 0) {
      var used = Number(s.animalCount) || 0;
      var usage = add(panel, "div", "lm-pricing-usage");
      var top = add(usage, "div", "lm-pricing-usage-top");
      add(top, "span", "", "Animal capacity");
      add(top, "span", "", used + " / " + e.animalLimit);
      var track = add(usage, "div", "lm-pricing-usage-track");
      var fill = add(track, "div", "lm-pricing-usage-bar");
      fill.style.width = Math.min(100, Math.max(0, 100 * used / e.animalLimit)) + "%";
      if (used > e.animalLimit) add(root, "div", "billing-status warn", "Your animals are preserved, but your current plan is above its animal limit. New registrations may be blocked by the server.");
    }
  }
  function planButton(card, p, e, s, isCurrent) {
    if (!p.paid) {
      add(card, "div", "lm-pricing-cta-note", isCurrent ? "Your current plan · No payment required" : "To return to Free, cancel your paid subscription below.");
      return;
    }
    var verb = ORDER[p.id] > ORDER[e.plan] ? "Upgrade to " : "Switch to ";
    var b = add(card, "button", "billing-btn", isCurrent ? "Your current plan" : verb + p.name);
    b.type = "button";
    b.disabled = isCurrent || !s.ready || !s.enforced;
    if (isCurrent) b.setAttribute("aria-label", p.name + " is your current plan");
    b.onclick = function () {
      if (e.state === "paid" && !e.cancelAtPeriodEnd && !confirm("This starts a new " + p.name + " subscription and cancels your current " + e.planName + " subscription. Continue?")) return;
      b.disabled = true; b.textContent = "Taking you to PayFast…";
      post(p.id).catch(function (err) { render(s, err.message); });
    };
    add(card, "div", "lm-pricing-cta-note", s.sandbox ? "PayFast sandbox — test payments only" : "Secure checkout via PayFast");
  }
  function renderCompare() {
    var wrap = add(root, "section", "lm-pricing-table-box");
    add(wrap, "h3", "", "The details, side by side");
    add(wrap, "p", "", "A quick comparison of the upcoming plan structure. On mobile, swipe across the table to see all plans.");
    var table = add(wrap, "table", "lm-pricing-table");
    var thead = add(table, "thead"); var tr = add(thead, "tr");
    ["Included tools", "Free", "Pro · R99", "Pro+ · R199"].forEach(function (t) { add(tr, "th", "", t); });
    var tbody = add(table, "tbody");
    COMPARE_ROWS.forEach(function (r) {
      var row = add(tbody, "tr");
      r.forEach(function (v, i) { add(row, "td", i ? (v === "✓" ? "yes" : v === "—" ? "no" : "") : "", v); });
    });
  }
  function renderFaq() {
    var block = add(root, "section", "lm-pricing-faq");
    add(block, "h3", "", "Questions farmers ask");
    [
      ["Will I lose my animals if I change plans?", "No. Your stored animals stay on your account. Adding new animals may be limited according to the active server plan."],
      ["Can Pro download financial PDF reports?", "Under the upcoming plans, both R99 Pro and R199 Pro+ include advanced PDF reports for an individual farm. Pro+ adds consolidated multi-farm reports."],
      ["Can I manage more than one farm?", "The upcoming Pro+ plan provides up to three farm workspaces. Free and Pro are designed for one farm."],
      ["Can I keep my health records and download my data?", "Yes. Basic health history and raw data exports remain available across all plans."],
      ["When do the new feature limits take effect?", "The new package descriptions are a preview. Existing server-side limits and feature permissions remain in effect until an updated backend is deployed."]
    ].forEach(function (faq) {
      var detail = add(block, "details");
      add(detail, "summary", "", faq[0]); add(detail, "p", "", faq[1]);
    });
  }
  function render(s, message) {
    root.textContent = "";
    var e = s.entitlement || { plan: "free", planName: "Free", animalLimit: 25, state: "free" };
    var previewWarning = add(root, "div", "lm-pricing-notice");
    add(previewWarning, "strong", "", "Upcoming plan structure — preview");
    add(previewWarning, "span", "", "The comparison below shows our planned packages. Current animal limits, farm access and premium permissions are still controlled by the live backend and may differ. This page update does not activate new restrictions.");
    if (!s.enforced) add(root, "div", "billing-status warn", "Billing enforcement is switched off on this server. All features are currently available; checkout is not active.");
    var locked = new URLSearchParams(location.search).get("locked");
    if (locked && PAGE_LABELS[locked] && !e.allPages) add(root, "div", "billing-status warn", PAGE_LABELS[locked] + " is restricted by your current server plan. Review your available plans below.");
    if (message) add(root, "div", "billing-status", message);
    renderStatus(s, e);
    var grid = add(root, "div", "billing-plans");
    (s.plans || []).forEach(function (p) {
      if (!PREVIEW[p.id]) return;
      var meta = PREVIEW[p.id];
      var isCurrent = e.plan === p.id && !(e.state === "paid" && e.cancelAtPeriodEnd);
      var card = add(grid, "article", "billing-plan" + (isCurrent ? " current" : "") + (p.id === "proplus" ? " popular" : ""));
      var top = add(card, "div", "lm-pricing-plan-top");
      add(top, "span", "lm-pricing-plan-type", meta.kicker);
      add(top, "span", "lm-pricing-plan-tag" + (p.id === "proplus" ? " best" : ""), isCurrent ? "Current plan" : meta.tag);
      add(card, "h2", "", p.name);
      add(card, "p", "lm-pricing-plan-desc", meta.tagline);
      var price = add(card, "div", "billing-price", p.paid ? rand(p.amount) : "R0");
      add(price, "small", "", p.paid ? "/ month" : "/ forever");
      var caps = add(card, "div", "lm-pricing-plan-capacity");
      meta.capacity.forEach(function (v) { add(caps, "span", "", v); });
      add(card, "span", "lm-pricing-section-label", "What's included");
      var features = add(card, "ul", "billing-features");
      meta.features.forEach(function (v) { add(features, "li", "", v); });
      var excluded = add(card, "div", "lm-pricing-not-included");
      add(excluded, "strong", "", p.id === "proplus" ? "Good to know" : "Not included");
      add(excluded, "span", "", meta.excludes);
      planButton(card, p, e, s, isCurrent);
    });
    if (!s.ready && s.enforced) add(root, "p", "billing-error", "Payments are not available yet. Please check back soon.");
    if (s.sandbox) add(root, "div", "billing-status warn", "PayFast is currently in test mode. No real payments are processed.");
    if (e.state === "paid" && !e.cancelAtPeriodEnd && e.status === "active") {
      var wrap = add(root, "div", "lm-pricing-cancel");
      var cancel = add(wrap, "button", "billing-btn secondary", "Cancel subscription"); cancel.type = "button";
      cancel.onclick = function () {
        if (!confirm("Cancel your subscription? You keep your paid plan until the end of the period you have paid for, then move to Free.")) return;
        cancel.disabled = true;
        api("/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function () { return refresh("Subscription cancelled."); }).catch(function (err) { cancel.disabled = false; render(s, err.message); });
      };
    }
    renderCompare();
    renderFaq();
    add(root, "p", "lm-pricing-footer-note", "All prices shown are in South African rand and billed monthly where applicable. PayFast handles payments. Live feature availability and animal limits remain subject to your account's current server entitlement. *Pro+ animal usage is subject to reasonable technical safeguards.");
  }
  function refresh(message) { return api_.load().then(function (s) { if (s) render(s, message); else root.textContent = "Could not load your plan. Please reload."; return s; }); }
  var returned = new URLSearchParams(location.search).get("payment");
  (window.LMAuthReady || Promise.resolve()).then(function () {
    if (returned === "success") {
      var tries = 0;
      (function poll() {
        refresh("Thank you. We are confirming your payment with PayFast…").then(function (s) {
          if (s && s.entitlement.state === "paid" && s.entitlement.status === "active") { render(s, "Payment confirmed. Your new plan is active!"); return; }
          if (++tries < 20) setTimeout(poll, 3000); else if (s) render(s, "Payment confirmation is still pending. Please check back shortly.");
        });
      })();
    } else refresh(returned === "cancelled" ? "Payment was cancelled. You have not been charged." : undefined);
  });
})();
