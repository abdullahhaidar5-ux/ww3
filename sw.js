// Keeps the game on the player's device after the first visit: it opens instantly and works offline (solo play).
// A new version is picked up in the background and used on the next launch.
const CACHE='ww3-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const page=e.request.mode==='navigate'||u.pathname.endsWith('/index.html');
  e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(page?'./index.html':e.request);
    const net=fetch(e.request).then(r=>{if(r.ok)c.put(page?'./index.html':e.request,r.clone());return r;}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit;}const r=await net;return r||new Response('Offline',{status:503});}));});
