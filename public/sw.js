/* Roamers Community — Service Worker v1.0 */
var CACHE = 'roamers-v1';
var ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/ROAMERS_LOGO.png'
];

/* Install — cache core assets */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

/* Activate — clean old caches */
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

/* Fetch — network first, fall back to cache */
self.addEventListener('fetch', function(e){
  /* Only handle GET requests for same origin or Unsplash images */
  if(e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  /* For Unsplash images — cache first (they don't change) */
  if(url.hostname === 'images.unsplash.com'){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        if(cached) return cached;
        return fetch(e.request).then(function(res){
          var clone = res.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
          return res;
        }).catch(function(){
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  /* For Google Fonts — cache first */
  if(url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        if(cached) return cached;
        return fetch(e.request).then(function(res){
          var clone = res.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
          return res;
        });
      })
    );
    return;
  }

  /* For app shell (same origin) — network first, cache fallback */
  if(url.origin === self.location.origin){
    e.respondWith(
      fetch(e.request).then(function(res){
        var clone = res.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(cached){
          return cached || caches.match('/index.html');
        });
      })
    );
  }
});
