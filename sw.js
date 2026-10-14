/**
 * Kampung Jawa Warrior - Service Worker (v2)
 * =================================================
 * Strategy:
 *  1. App shell (HTML, manifest, icons, fonts) -> Stale-while-revalidate.
 *     This makes the app load instantly and work fully offline.
 *  2. Google Apps Script sync requests (script.google.com) -> Network-only,
 *     NEVER cached. Otherwise offline scores would be served stale responses.
 *  3. Cross-origin opaque requests (e.g. game image fallbacks) -> pass through.
 *
 * CHANGES IN v2 (fixes "404 after install on Android"):
 *  - Bumped CACHE_VERSION: 'kjw-v1' -> 'kjw-v2'. Old cache (which may contain
 *    a poisoned 404 response from a previous failed launch) is purged on
 *    activation, so the next launch fetches a fresh 200 from network.
 *  - Navigation handler now ONLY caches 200 OK responses. Previously a 404
 *    (or 5xx) response would be cached and re-served forever, blocking
 *    recovery even after the server is fixed.
 *  - Navigation handler caches under the ACTUAL request URL (not a hard-coded
 *    key), so different entry URLs don't pollute each other's cache entries.
 *  - Added './index.html' to PRECACHE_URLS + navigation fallback chain so the
 *    app launches correctly whether the start_url is './' or the main file.
 *  - Better offline fallback chain: cached-request -> main html -> index.html
 *    -> root -> 503 'Offline' page.
 *
 * Version: kjw-v2
 */

const CACHE_VERSION = 'kjw-v2';
const CACHE_NAME = `kampung-jawa-warrior-${CACHE_VERSION}`;

// The canonical app shell HTML (used as fallback for ANY navigation request
// when offline). Listed first = highest priority in the fallback chain.
const APP_SHELL_HTML = './kampung-jawa-warrior.html';

// Resources that MUST be available offline (the app shell).
const PRECACHE_URLS = [
  './',
  './index.html',
  './kampung-jawa-warrior.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon-180.png',
  './favicon-32.png',
  // Google Fonts CSS. Cross-origin; cached as opaque response (no-cors).
  // If precaching fails (e.g. offline at install time), silently skipped;
  // the app still works with system font fallback.
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Orbitron:wght@500;700&display=swap'
];

// Hosts whose requests must NEVER be cached (always go to network).
// CRITICAL: caching sync responses would make offline scores appear to be
// "synced" (stale success response served from cache) without actually
// reaching Google Sheets.
const NEVER_CACHE_HOSTS = [
  'script.google.com',
  'docs.google.com'
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Use Promise.allSettled so a single failed precache (e.g. fonts
    // unreachable at install time) doesn't break installation.
    const results = await Promise.allSettled(
      PRECACHE_URLS.map(async (url) => {
        const isCrossOrigin = !url.startsWith('./') && !url.startsWith('/');
        const opts = isCrossOrigin ? { mode: 'no-cors', cache: 'no-cache' } : { cache: 'reload' };
        const resp = await fetch(url, opts);
        // Only cache responses that succeeded (200 OK or opaque for no-cors).
        // This prevents 404 responses from being cached and served forever.
        if (resp.ok || resp.type === 'opaque') {
          await cache.put(url, resp);
        } else {
          console.warn(`[KJW SW] Pre-cache skipped (status ${resp.status}): ${url}`);
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
    // Purge ALL caches that don't match the current version. This includes
    // the old 'kjw-v1' cache which may contain poisoned 404 responses from
    // a previous failed install. Without this purge, the bad cached 404
    // would keep being served on PWA launch.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('kampung-jawa-warrior-') && k !== CACHE_NAME)
        .map(k => {
          console.log(`[KJW SW] Purging old cache: ${k}`);
          return caches.delete(k);
        })
    );
    await self.clients.claim();
    console.log(`[KJW SW] Activated ${CACHE_NAME}. Old caches purged.`);
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
    return;
  }

  const url = new URL(req.url);
  const host = url.hostname;

  // ====== NEVER CACHE: Google Sheets sync ======
  if (NEVER_CACHE_HOSTS.includes(host) && !FONT_HOSTS.includes(host)) {
    return; // Pass through to network.
  }

  // ====== Cross-origin Google Fonts: stale-while-revalidate ======
  if (FONT_HOSTS.includes(host)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ====== Navigation requests (HTML page loads) ======
  // Strategy: network-first with multi-key offline fallback.
  // - Online: fetch from network; cache the 200 response under the actual
  //   request URL AND under APP_SHELL_HTML so any navigation URL can later
  //   fall back to it.
  // - Offline: try cached request URL -> APP_SHELL_HTML -> index.html -> './'
  //   -> 503 'Offline' placeholder.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const netResp = await fetch(req);
        // CRITICAL FIX: only cache successful responses. Caching a 404
        // here would poison the cache and the same 404 would be served
        // forever on every subsequent launch.
        if (netResp && netResp.ok) {
          // Cache under actual request URL.
          cache.put(req, netResp.clone()).catch(() => {});
          // Also cache under canonical key so ANY navigation URL
          // can fall back to this response when offline.
          cache.put(APP_SHELL_HTML, netResp.clone()).catch(() => {});
        }
        return netResp;
      } catch (err) {
        // Network failed (offline). Try cache keys in priority order.
        // 1. The exact URL the user navigated to.
        const cachedReq = await cache.match(req);
        if (cachedReq) return cachedReq;
        // 2. The canonical app shell HTML.
        const cachedMain = await cache.match(APP_SHELL_HTML);
        if (cachedMain) return cachedMain;
        // 3. The index.html entry point.
        const cachedIndex = await cache.match('./index.html');
        if (cachedIndex) return cachedIndex;
        // 4. The root directory URL.
        const cachedRoot = await cache.match('./');
        if (cachedRoot) return cachedRoot;
        // 5. Final fallback: a friendly offline page.
        return new Response(
          '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<title>Offline - Kampung Jawa Warrior</title>' +
          '<body style="background:#050510;color:#00f3ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px">' +
          '<div><h1>🔇 Offline</h1><p style="color:#aaa">Aplikasi belum selesai di-cache.</p>' +
          '<p style="color:#aaa">Hubungkan ke internet sekali, buka aplikasi, lalu tutup dan buka lagi — setelah itu app akan jalan offline.</p></div>' +
          '</body></html>',
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
 * Only successful (200 OK or opaque) responses are cached — never 4xx/5xx,
 * to avoid cache poisoning.
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
