// The old JavaScript game registered this service worker to keep itself offline. The game is now the Godot edition,
// which does not use one: this version clears the old saved copy and removes itself, so every visitor gets the new game.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))
  .then(()=>self.registration.unregister()).then(()=>self.clients.matchAll({type:'window'}))
  .then(cs=>cs.forEach(c=>{try{c.navigate(c.url);}catch(x){}})));});
