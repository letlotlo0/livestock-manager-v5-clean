/* Livestock Manager © notice — UI-only. No API or user data access. */
(() => {
  "use strict";
  function installCopyright() {
    if (document.querySelector("[data-lm-copyright]")) return;
    const year = new Date().getFullYear();
    const notice = document.createElement("div");
    notice.className = "lm-copyright-notice";
    notice.setAttribute("data-lm-copyright", "");
    notice.setAttribute("role", "contentinfo");
    notice.textContent = `© ${year} Livestock Manager. All Rights Reserved. Developed & Founded by Letlotlo Lesege.`;

    const host = document.querySelector("footer:not(.lm-copyright-notice)");
    if (host) {
      const line = document.createElement("span");
      line.className = "lm-copyright-line";
      line.textContent = notice.textContent;
      line.setAttribute("data-lm-copyright", "");
      host.appendChild(line);
    } else {
      document.body.appendChild(notice);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installCopyright, { once: true });
  } else {
    installCopyright();
  }
})();
