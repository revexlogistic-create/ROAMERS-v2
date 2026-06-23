/* Roamers Community — Service Worker (self-retiring recovery build)
 *
 * A previous service worker cached broken pages during a backend outage and
 * kept serving them. This build deletes ALL caches, unregisters itself, and
 * reloads open pages so every device returns to the live site. It has NO fetch
 * handler, so nothing is cached — all requests go straight to the network.
 */
self.addEventListener('install', function(){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.registration.unregister(); })
      .then(function(){ return self.clients.matchAll({ type: 'window' }); })
      .then(function(clients){
        clients.forEach(function(c){ try { c.navigate(c.url); } catch(err){} });
      })
  );
});
