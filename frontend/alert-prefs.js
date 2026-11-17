/* Email alert on/off switch. Daily emails list births, weaning and health tasks that need attention. */
(function () {
  "use strict";
  var status = document.getElementById("emailAlertsStatus"), button = document.getElementById("emailAlertsButton");
  if (!status || !button) return;
  var on = true;
  function show() {
    status.textContent = on ? "On. We email you once a day when births, weaning or vaccinations need attention." : "Off. You will only see alerts on this page.";
    button.textContent = on ? "Turn off email alerts" : "Turn on email alerts"; button.disabled = false;
  }
  function call(method, body) {
    return fetch("/api/alerts/prefs", { method: method, credentials: "same-origin", cache: "no-store", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "Request failed"); return d; }); });
  }
  button.onclick = function () {
    button.disabled = true;
    call("PUT", { emailAlerts: !on }).then(function (d) { on = d.emailAlerts; show(); }).catch(function (e) { status.textContent = "Could not save: " + e.message; button.disabled = false; });
  };
  (window.LMAuthReady || Promise.resolve()).then(function () {
    return call("GET").then(function (d) { on = d.emailAlerts !== false; show(); });
  }).catch(function () { status.textContent = "Email alerts are not available right now."; });
})();
