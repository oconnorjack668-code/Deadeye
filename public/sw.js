// public/sw.js
// Pages hold private player data, so HTML and API responses are not cached, except the
// session loggers: those are kept (network first) so players can log in a gym with no
// signal. That page cache is wiped on sign out (see Navbar). Everything else falls back
// to a static offline page. Public, versioned static assets are cached.
// Bumped to v4 for the Deadeye icons: icon-192 and icon-512 are precached
// below, so without a new cache name installed devices keep serving the old
// HoopIQ artwork. The activate handler deletes any cache that is not this one
// or PAGE_CACHE, so the old assets go and the offline logger pages stay.
//
// The 'hoopiq-' prefix is deliberate and is not part of the rename: PAGE_CACHE
// and the localStorage keys hold a player's unsynced work, and renaming them
// would strand it on every device that already has the app.
// v5 precaches the make and miss sounds, so a session logged offline is not silent.
const CACHE_NAME = 'hoopiq-v5';
const PAGE_CACHE = 'hoopiq-pages-v1';
const OFFLINE_PAGES = ['/basketball/new', '/workouts/new', '/games/new'];

const ASSETS_TO_CACHE = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/sounds/swish.mp3',
  '/sounds/rim-clank.mp3',
];

// Install event - cache the offline page and icons
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

// Activate event - remove caches from older versions (including v1's cached pages)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME && name !== PAGE_CACHE).map((name) => caches.delete(name))))
  );
  self.clients.claim();
});

// Training reminders (web push)
self.addEventListener('push', (event) => {
  let data = { title: 'Deadeye', body: 'Time to train!', url: '/dashboard' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // plain-text payload
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    })
  );
});

// The app asks for the loggers to be stored (with their scripts) while online,
// so they open offline even if the player never visited them with signal.
async function warmOfflinePages() {
  const pages = await caches.open(PAGE_CACHE);
  const assets = await caches.open(CACHE_NAME);
  for (const path of OFFLINE_PAGES) {
    try {
      const response = await fetch(path, { credentials: 'same-origin' });
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      await pages.put(path, response);
      const scripts = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
      for (const src of scripts) {
        if (!(await assets.match(src))) {
          const asset = await fetch(src);
          if (asset.ok) await assets.put(src, asset);
        }
      }
    } catch {
      // offline or server error: try again next time
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'warm-offline-pages') event.waitUntil(warmOfflinePages());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => 'focus' in w);
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Session loggers: network first, keep the latest copy for offline use
  if (request.mode === 'navigate' && OFFLINE_PAGES.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache the real page, not a redirect to /login
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match('/offline.html')) || Response.error())
    );
    return;
  }

  // Other page navigations: network only, offline page when there is no connection
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error())
    );
    return;
  }

  // Build assets are content-hashed, so cache-first is safe
  if (url.pathname.startsWith('/_next/static/') || ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
  // Everything else (API, data, uploads) goes straight to the network
});
