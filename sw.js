// Keeps the game on the player's device after the first visit so it works offline (solo play).
// The game page itself is fetched fresh whenever the network answers within a few seconds, so everyone in a match
// runs the same version; the saved copy is used only when offline or on a very slow connection.
// Install saves only the page files. The 3D models (models/*.glb.gz) are saved as the page downloads them (a battle's
// nations first, then the rest quietly from the menu), so a first visit's battle does not compete with ~60 downloads.
// Models the page fetched before this worker took over are saved when the page names them (message 'models', sent
// once a battle's models are in). Their names carry a content hash, so a saved model never goes stale; ones the
// current page no longer lists are dropped. MODELS is written by orch/build.py - do not edit it.
const CACHE='ww3-v3';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const MODELS=["./models/b_barr.89fd566f29.glb.gz","./models/b_barr_me.118f68ab06.glb.gz","./models/b_crane.5eca41acfc.glb.gz","./models/b_dock.6ffd4d3a9b.glb.gz","./models/b_fact.3129194cb4.glb.gz","./models/b_fact_me.479586a209.glb.gz","./models/b_hq.82b9fb5801.glb.gz","./models/b_hq_me.1614e0c101.glb.gz","./models/b_pad.7e37931bf1.glb.gz","./models/b_radar.832db7bdf2.glb.gz","./models/b_turret.b64f4db38c.glb.gz","./models/barrel.854044b4ba.glb.gz","./models/boat.e41d1ace4a.glb.gz","./models/container.6745037308.glb.gz","./models/containerG.ec9d69899e.glb.gz","./models/crate.3a941a6b2c.glb.gz","./models/drone.5bb8efca6f.glb.gz","./models/fence.7288d7c91a.glb.gz","./models/heli.20f2fe3b5b.glb.gz","./models/hero.d0ee3f21d7.glb.gz","./models/jet.2f35ca9bf9.glb.gz","./models/m_abrams.52f6903fc3.glb.gz","./models/m_apache.81cf9d5d7f.glb.gz","./models/m_f15.0b51c20254.glb.gz","./models/m_f16.835f3ab859.glb.gz","./models/m_f18.6bca2a351c.glb.gz","./models/m_g6.1d565f515f.glb.gz","./models/m_hilux.7d78bf2113.glb.gz","./models/m_humvee.b257f6eb30.glb.gz","./models/m_j10.e52ca276ec.glb.gz","./models/m_jd550.06c1232026.glb.gz","./models/m_kf51.d9f76accc4.glb.gz","./models/m_leo2.07228e9aa9.glb.gz","./models/m_m35.9518a1023f.glb.gz","./models/m_merkava.caaeea9de8.glb.gz","./models/m_mi24.d3e55595ff.glb.gz","./models/m_mi8.e48c25b717.glb.gz","./models/m_mig29.2cbf21b444.glb.gz","./models/m_msta.5d368fd65b.glb.gz","./models/m_oplot.02c28622fc.glb.gz","./models/m_ozelot.8c9e4a25c3.glb.gz","./models/m_rafale.ff23999905.glb.gz","./models/m_su35.3da4efd207.glb.gz","./models/m_t55.b5a55503cd.glb.gz","./models/m_t62.163a1d74c2.glb.gz","./models/m_t72.b14870e260.glb.gz","./models/m_t90.dfa980544f.glb.gz","./models/m_typhoon.cd7fbb91c0.glb.gz","./models/m_uh60.5e388a1d87.glb.gz","./models/m_ural.859f380e88.glb.gz","./models/missile.8c2c6ad1ef.glb.gz","./models/pallet.7e426f3962.glb.gz","./models/sam.81b2032c15.glb.gz","./models/sandbag.c1c379b785.glb.gz","./models/ship.8e567999af.glb.gz","./models/sol_e.35a536924a.glb.gz","./models/sol_m.a8b139a922.glb.gz","./models/sol_w.327a713009.glb.gz","./models/soldier.aa367fa8d7.glb.gz","./models/tank.21eb4f6d66.glb.gz","./models/tankE.2ad4dc22c0.glb.gz","./models/technical.793ad4ca01.glb.gz","./models/tent.9cc9f7eeba.glb.gz","./models/toontank.0ad5a441e2.glb.gz","./models/tree1.cd71389139.glb.gz","./models/tree2.249b6298e5.glb.gz","./models/tree3.f6cfeb1653.glb.gz","./models/tree4.53a5a54201.glb.gz","./models/truck.69abf86738.glb.gz","./models/watertower.d291e5d9c2.glb.gz"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
// the page lists model files it already has (usually straight from the browser's own cache): save the missing ones
self.addEventListener('message',e=>{const d=e.data;if(!d||d.t!=='models'||!Array.isArray(d.urls))return;const ok=new Set(MODELS.map(u=>new URL(u,self.location).href));
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(d.urls.slice(0,200).map(u=>{let h;try{h=new URL(u,self.location).href;}catch(x){return;}if(!ok.has(h))return;
    return c.match(h).then(m=>m||c.add(h)).catch(()=>{});}))));});
self.addEventListener('activate',e=>{const keep=new Set(MODELS.map(u=>new URL(u,self.location).href));
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>caches.open(CACHE)).then(c=>c.keys().then(rs=>Promise.all(rs.filter(r=>/\/models\//.test(new URL(r.url).pathname)&&!keep.has(r.url)).map(r=>c.delete(r)))))
    .then(()=>self.clients.claim()));});
// The soundtrack (mus/st/*.mp3, ~32 MB) is never saved here: each track streams when it is about to play (the browser's
// own cache keeps it); offline, the game falls back to its generated score.
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||/\/mus\/st\//.test(u.pathname))return;
  const page=e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/');
  e.respondWith(caches.open(CACHE).then(async c=>{const key=page?'./index.html':e.request;
    // a model file never changes under its name: a saved copy is served without asking the network again
    if(/\/models\/[^/]+\.glb\.gz$/.test(u.pathname)){const hit=await c.match(key);if(hit)return hit;const r=await fetch(e.request).catch(()=>null);if(r&&r.ok)c.put(key,r.clone());return r||new Response('Offline',{status:503});}
    const net=fetch(e.request,page?{cache:'no-cache'}:undefined).then(r=>{if(r.ok)c.put(key,r.clone());return r;}).catch(()=>null);
    if(page){const hit=await c.match(key);if(!hit){const r=await net;return r||new Response('Offline',{status:503});}
      const r=await Promise.race([net,new Promise(res=>setTimeout(()=>res(null),4000))]);if(r&&r.ok)return r;e.waitUntil(net);return hit;}
    const hit=await c.match(key);if(hit){e.waitUntil(net);return hit;}const r=await net;return r||new Response('Offline',{status:503});}));});
