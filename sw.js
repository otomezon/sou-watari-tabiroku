const CACHE_NAME = 'sou-watari-tabiroku-v4-7-3';
const APP_ROOT = new URL('./', self.location.href);
const appUrl = (path) => new URL(path, APP_ROOT).href;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icons/icon.svg',
  './icons/icon-192.png', './icons/icon-512.png',
  './audio/tutorial-theme.mp3', './audio/beginner-theme.mp3',
  './audio/intermediate-theme.mp3', './audio/advanced-theme.mp3',
  './audio/expert-theme.mp3', './audio/boss-theme.mp3',
  './audio/level-up-fanfare.mp3', './audio/game-over.mp3',
].map(appUrl);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) =>
          (key.startsWith('fushigi-dungeon-') || key.startsWith('sou-watari-tabiroku-')) && key !== CACHE_NAME,
        ).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRECACHE_URLS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope);
    const cache = await caches.open(CACHE_NAME);
    const urls = [...new Set(event.data.urls.flatMap((value) => {
      if (typeof value !== 'string') return [];
      try {
        const url = new URL(value, scope);
        if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || url.pathname.endsWith('/sw.js')) return [];
        return [url.href];
      } catch {
        return [];
      }
    }))];
    await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok && response.type === 'basic') await cache.put(url, response);
      } catch {
        // Keep the cached app shell available when a runtime asset cannot be refreshed.
      }
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_ROOT.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match(appUrl('./index.html'));
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
