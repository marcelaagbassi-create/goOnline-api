// ══════════════════════════════════════════════
//  goOnline Service Worker v1.0
//  By DAVIESLAY 💥
// ══════════════════════════════════════════════

const CACHE_NAME = 'goonline-v1';
const OFFLINE_URL = '/offline.html';

// Ressources à mettre en cache immédiatement
const PRECACHE = [
  '/',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;1,9..40,300&display=swap',
];

// ── Installation ───────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installation goOnline v1.0');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(err => {
        console.warn('[SW] Précache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activation ─────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activation');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Stratégie Network First ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et l'API Render
  if (request.method !== 'GET') return;
  if (url.hostname.includes('onrender.com')) return;
  if (url.hostname.includes('generativelanguage')) return;
  if (url.hostname.includes('mistral')) return;
  if (url.protocol === 'chrome-extension:') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Mettre en cache les réponses valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Hors ligne → chercher dans le cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Page HTML → offline fallback
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/').then(home => home || new Response(
              offlinePage(), { headers: { 'Content-Type': 'text/html' } }
            ));
          }
        });
      })
  );
});

// ── Page offline fallback ──────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>goOnline — Hors ligne</title>
<style>
  body{background:#0a0a15;color:#f1f5f9;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;gap:1rem;}
  .logo{font-size:2rem;font-weight:900;letter-spacing:-.04em}
  .logo span{color:#a3e635}
  h2{font-size:1.3rem;font-weight:700;margin-top:.5rem}
  p{color:#64748b;max-width:300px;line-height:1.6;font-size:.88rem}
  button{background:#4f46e5;color:white;border:none;padding:.8rem 1.8rem;border-radius:8px;font-size:.88rem;font-weight:700;cursor:pointer;margin-top:1rem}
</style>
</head>
<body>
  <div class="logo"><span>go</span>Online</div>
  <h2>Vous êtes hors ligne</h2>
  <p>Vérifiez votre connexion internet et réessayez. goOnline sera de retour dès que vous serez connecté.</p>
  <button onclick="location.reload()">Réessayer →</button>
</body>
</html>`;
}

// ── Push notifications (préparation future) ────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'goOnline', {
    body: data.body || 'Nouvelle notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'goonline-notif',
    data: { url: data.url || '/' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
