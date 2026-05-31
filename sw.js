// ══════════════════════════════════════════════
//  goOnline Service Worker v2.0
//  By DAVIESLAY 💥
// ══════════════════════════════════════════════

const CACHE_NAME = 'goonline-v2';

const PRECACHE = [
  './',
  './manifest.json',
];

// ── Installation ───────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW goOnline] Installation v2.0');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).catch(e => console.warn('[SW] Précache partiel:', e)))
      .then(() => self.skipWaiting())
  );
});

// ── Activation ─────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW goOnline] Activation');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et APIs externes
  if (request.method !== 'GET') return;
  if (url.hostname.includes('onrender.com')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('mistral.ai')) return;
  if (url.hostname.includes('fonts.g')) return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.protocol === 'data:') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            try { cache.put(request, clone); } catch(e) {}
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Fallback HTML offline
          if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
            return caches.match('./').then(home => {
              if (home) return home;
              return new Response(
                `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>goOnline — Hors ligne</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a15;color:#f1f5f9;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;gap:1rem}.logo{font-size:2.5rem;font-weight:900;letter-spacing:-.04em}.logo span{color:#a3e635}h2{font-size:1.2rem;margin-top:.5rem}p{color:#64748b;max-width:280px;line-height:1.6;font-size:.88rem;margin-top:.3rem}button{background:#4f46e5;color:white;border:none;padding:.8rem 2rem;border-radius:8px;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:1.5rem}</style></head><body><div class="logo"><span>go</span>Online</div><h2>Vous etes hors ligne</h2><p>Verifiez votre connexion internet et reessayez.</p><button onclick="location.reload()">Reessayer</button></body></html>`,
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
          }
        });
      })
  );
});

// ── Notifications push (futur) ─────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'goOnline', {
      body: data.body || 'Nouvelle notification',
      tag: 'goonline',
      data: { url: data.url || './' }
    });
  } catch(e) {}
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : './';
  event.waitUntil(clients.openWindow(url));
});
