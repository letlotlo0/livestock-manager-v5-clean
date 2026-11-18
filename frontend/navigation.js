/* Livestock Manager v4.0.8 — navigation that does not depend on page-specific CSS/JS */
(function () {
  "use strict";

  function toggleMenu(button) {
    var nav = document.getElementById("navLinks");
    if (!nav) return false;

    var open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    nav.style.setProperty("display", open ? "flex" : "", "important");
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    return false;
  }

  window.LMNavToggle = toggleMenu;

  function closeMenu() {
    var nav = document.getElementById("navLinks");
    var button = document.getElementById("menuButton");
    if (!nav) return;
    nav.classList.remove("open");
    nav.style.removeProperty("display");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open navigation");
    }
  }

  function init() {
    var button = document.getElementById("menuButton");
    var nav = document.getElementById("navLinks");
    if (!button || !nav) return;

    // Keep an inline fallback on the button so navigation still works even if
    // another page script fails before navigation.js runs.
    // Capture the click before any older page-specific handlers can toggle twice.
    // The HTML retains a fallback onclick for users with blocked scripts.
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleMenu(button);
    }, true);

    nav.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest("a") : null;
      if (link && nav.contains(link)) closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("open")) return;
      if (button.contains(event.target) || nav.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });

    closeMenu();
  }

  /* V5.3 Phase 5: discoverable workspaces. No changes to Dashboard or Profile markup. */
  function addBreedingWorkspaces() {
    var menu = document.querySelector("#navLinks .lm-more-popover");
    if (!menu) return;
    var links = [{href:"birth-records.html", label:"Birth records"}, {href:"stud-management.html", label:"Stud management"}];
    links.forEach(function (item) {
      if (menu.querySelector('a[href="' + item.href + '"]')) return;
      var link = document.createElement("a"); link.href = item.href; link.textContent = item.label;
      var anchor = menu.querySelector('a[href="farm-alerts.html"]');
      if (anchor) menu.insertBefore(link, anchor); else menu.appendChild(link);
    });
  }

  /* Plans link + lock icons. The server enforces access; this only makes the menu honest. */
  function planNav() {
    var nav = document.getElementById("navLinks");
    if (!nav || !window.fetch) return;
    fetch("/api/billing/status", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) {
        if (!s || !s.enforced) return;
        if (!nav.querySelector('a[href="subscription.html"]')) {
          var a = document.createElement("a"); a.href = "subscription.html"; a.textContent = "Plans"; nav.appendChild(a);
        }
        if (s.entitlement.allPages) return;
        document.querySelectorAll("a[href]").forEach(function (link) {
          var name = (link.getAttribute("href") || "").split("?")[0].split("#")[0].replace(/^\.?\//, "").replace(/\.html$/, "");
          if (s.paidPages.indexOf(name) === -1) return;
          link.setAttribute("href", "subscription.html?locked=" + encodeURIComponent(name));
          if (nav.contains(link) && !link.dataset.locked) { link.dataset.locked = "1"; link.appendChild(document.createTextNode(" \uD83D\uDD12")); }
        });
      }).catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    document.addEventListener("DOMContentLoaded", addBreedingWorkspaces, { once: true });
    document.addEventListener("DOMContentLoaded", planNav, { once: true });
  } else {
    init();
    addBreedingWorkspaces();
    planNav();
  }
})();
