const CACHE = 'goonline-v3';
const BASE = '/goOnline-api';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([BASE + '/', BASE + '/manifest.json']).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('onrender.com')) return;
  if (url.hostname.includes('googleapis')) return;
  if (url.hostname.includes('mistral')) return;
  if (url.protocol === 'chrome-extension:') return;

  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200) {
          const c = r.clone();
          caches.open(CACHE).then(cache => { try { cache.put(e.request, c); } catch(err){} });
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
          return caches.match(BASE + '/').catch(() =>
            new Response(
              '<html><head><meta charset="UTF-8"><title>goOnline</title></head><body style="background:#0a0a15;color:#f1f5f9;font-family:sans-serif;text-align:center;padding:3rem"><h1 style="color:#a3e635;font-size:2rem">goOnline</h1><p style="color:#64748b;margin:1rem 0">Hors ligne — verifiez votre connexion</p><button onclick="location.reload()" style="background:#4f46e5;color:white;border:none;padding:.8rem 2rem;border-radius:8px;font-size:1rem;cursor:pointer">Reessayer</button></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          );
        }
      }))
  );
});
