/* Revierbuch service worker: app shell offline, map tiles cached as they are viewed */
const VERSION = 'v3';
const SHELL = 'shell-' + VERSION, TILES = 'tiles-v1', FONTS = 'fonts-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'lots-lu.geojson', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const MAX_TILES = 6000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req.url, { ignoreVary: true });
  if (hit) return hit;
  let res;
  try { res = await fetch(req.url, { mode: 'cors' }); } catch (_) { res = await fetch(req); }
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(req.url, res.clone()).then(() => { if (Math.random() < 0.025) trim(cache, MAX_TILES); }).catch(() => {});
  }
  return res;
}

async function swr(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch: false });
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    } else {
      e.respondWith(swr(req, SHELL));
    }
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(swr(req, FONTS)); return; }
  if (req.destination === 'image') { e.respondWith(tile(req)); }
});
