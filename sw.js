'use strict';
// Change VERSION whenever any shell asset changes. No user data is cached.
const VERSION = '20261014-pwa-1';
const APP_ROOT = new URL('./', self.location.href);
const CACHE_PREFIX = 'coffee-shell:' + APP_ROOT.pathname + ':';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const SHELL = ['index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.ico','favicon.svg'].map(path => new URL(path, APP_ROOT).href);
self.addEventListener('install', event => {
  // A failed download rejects installation and preserves the previous working app.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL.map(url => new Request(url, {cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
  if (event.data?.type === 'CHECK_OFFLINE' && event.ports[0]) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const responses = await Promise.all(SHELL.map(url => cache.match(url)));
      event.ports[0].postMessage({ready: responses.every(Boolean), version:VERSION});
    })());
  }
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== APP_ROOT.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  const home = url.pathname === APP_ROOT.pathname || url.pathname === APP_ROOT.pathname + 'index.html';
  // Cache-first shell keeps HTML and its assets on the same version until consent to update.
  if (request.mode === 'navigate' && home) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(SHELL[0])) || fetch(request)));
  } else if (SHELL.includes(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(url.href)) || fetch(request)));
  }
});
