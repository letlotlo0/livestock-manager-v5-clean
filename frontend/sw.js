/* Auth-safe static asset cache. Never cache HTML documents, API responses or token URLs. */
const CACHE="livestock-manager-production-ai-2026-11-26";
const ASSETS=["./assets/livestock-logo.svg","./assets/livestock-logo.png","./premium-ui.css","./navigation-premium.css","./login.css","./register.css","./v51-design.css","./v51-design.js","./v51-auth.css"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("livestock-manager-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/")||req.mode==="navigate"||url.search)return;
 if(!ASSETS.some(asset=>url.pathname.endsWith(asset.replace(/^\.\//,""))))return;
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}return response;})));
});
