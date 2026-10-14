/**
 * Kampung Jawa Warrior - Service Worker
 * =====================================
 * Strategy:
 *  1. App shell (HTML, manifest, icons, fonts) -> Stale-while-revalidate.
 *     This makes the app load instantly and work fully offline.
 *  2. Google Apps Script sync requests (script.google.com) -> Network-only,
 *     NEVER cached. Otherwise offline scores would be served stale responses.
 *  3. Cross-origin opaque requests (e.g. game image fallbacks) -> pass through.
 *
 * Version: kjw-v1
 */

const CACHE_VERSION = 'kjw-v1';
const CACHE_NAME = `kampung-jawa-warrior-${CACHE_VERSION}`;

// Resources that MUST be available offline (the app shell).
const PRECACHE_URLS = [
  './',
  './kampung-jawa-warrior.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon-180.png',
  './favicon-32.png',
  // Google Fonts CSS + Font files. These are cross-origin; we cache them
  // using opaque responses (mode: 'no-cors'). If they fail to pre-cache
  // (e.g. offline during install), we silently skip.
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Orbitron:wght@500;700&display=swap'
];

// Hosts whose requests must NEVER be cached (always go to network).
const NEVER_CACHE_HOSTS = [
  'script.google.com',
  'docs.google.com',
  'googleapis.com'        // Note: we *do* want to cache fonts.googleapis.com CSS, handled below explicitly
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Use Promise.allSettled so a single failed precache (e.g. fonts
    // unreachable at install time) doesn't break installation.
    const results = await Promise.allSettled(
      PRECACHE_URLS.map(async (url) => {
        // For cross-origin font URLs we must use no-cors to avoid CORS errors
        // during precaching. The cached response will be opaque but still
        // usable as a fallback when offline.
        const isCrossOrigin = !url.startsWith('./') && !url.startsWith('/');
        const opts = isCrossOrigin ? { mode: 'no-cors', cache: 'no-cache' } : { cache: 'reload' };
        const resp = await fetch(url, opts);
        // Only cache responses that succeeded (opaque responses have status 0
        // but are still valid for no-cors caching).
        if (resp.ok || resp.type === 'opaque') {
          await cache.put(url, resp);
        }
      })
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[KJW SW] Install complete. ${PRECACHE_URLS.length - failed} cached, ${failed} skipped.`);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Purge old cache versions.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('kampung-jawa-warrior-') && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
    console.log(`[KJW SW] Activated ${CACHE_NAME}.`);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET. POST (sync to Google Sheets) must always go to network.
  if (req.method !== 'GET') {
    return; // Let the browser handle it normally.
  }

  const url = new URL(req.url);
  const host = url.hostname;

  // ====== NEVER CACHE: Google Sheets sync ======
  // This is critical: if we cached sync responses, then offline scores
  // would receive stale "success" responses without actually syncing.
  if (NEVER_CACHE_HOSTS.includes(host) && !FONT_HOSTS.includes(host)) {
    // Network-only — just let it pass through.
    return;
  }

  // ====== Cross-origin Google Fonts: stale-while-revalidate ======
  if (FONT_HOSTS.includes(host)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ====== Same-origin app shell: stale-while-revalidate with offline fallback ======
  // For navigation requests, fall back to cached HTML page when offline
  // (so the app launches even with no connectivity).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Try network first for navigations (so updates are picked up), but
        // fall back to cache quickly when offline.
        const netResp = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./kampung-jawa-warrior.html', netResp.clone()).catch(() => {});
        return netResp;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./kampung-jawa-warrior.html');
        if (cached) return cached;
        // Final fallback: app shell root.
        const root = await cache.match('./');
        if (root) return root;
        return new Response(
          '<h1>Offline</h1><p>Aplikasi belum ter-cache. Hubungkan ke internet sekali lalu buka kembali.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // ====== Other same-origin GET (icons, manifest, etc.) ======
  event.respondWith(staleWhileRevalidate(req));
});

/**
 * Stale-while-revalidate: serve from cache immediately, fetch fresh in
 * background, and update cache when the fresh response comes back.
 */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const networkFetch = fetch(req)
    .then(resp => {
      if (resp && (resp.ok || resp.type === 'opaque')) {
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    })
    .catch(() => undefined);
  return cached || networkFetch || new Response('', { status: 504 });
}
