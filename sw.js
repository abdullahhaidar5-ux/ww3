// Keeps the game on the player's device after the first visit so it works offline (solo play).
// The game page itself is fetched fresh whenever the network answers within a few seconds, so everyone in a match
// runs the same version; the saved copy is used only when offline or on a very slow connection.
const CACHE='ww3-v2';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const page=e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/');
  e.respondWith(caches.open(CACHE).then(async c=>{const key=page?'./index.html':e.request;
    const net=fetch(e.request,page?{cache:'no-cache'}:undefined).then(r=>{if(r.ok)c.put(key,r.clone());return r;}).catch(()=>null);
    if(page){const hit=await c.match(key);if(!hit){const r=await net;return r||new Response('Offline',{status:503});}
      const r=await Promise.race([net,new Promise(res=>setTimeout(()=>res(null),4000))]);if(r&&r.ok)return r;e.waitUntil(net);return hit;}
    const hit=await c.match(key);if(hit){e.waitUntil(net);return hit;}const r=await net;return r||new Response('Offline',{status:503});}));});
