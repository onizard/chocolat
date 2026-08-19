/* Chocolat — service worker
   Rôle : rendre l'application utilisable sans connexion et satisfaire
   les critères d'installation de Chrome sur Android. */

const CACHE = 'chocolat-v14';
const COQUILLE = [
  './',
  './index.html',
  './mouvements.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(COQUILLE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const externe = url.origin !== self.location.origin;

  // Polices Google : on sert le cache d'abord, on rafraîchit en arrière-plan.
  if (externe) {
    e.respondWith(
      caches.match(req).then(hit => {
        const reseau = fetch(req).then(rep => {
          if (rep && (rep.ok || rep.type === 'opaque')) {
            const copie = rep.clone();
            caches.open(CACHE).then(c => c.put(req, copie));
          }
          return rep;
        }).catch(() => hit);
        return hit || reseau;
      })
    );
    return;
  }

  // Fichiers de l'application : réseau d'abord, cache en secours.
  e.respondWith(
    fetch(req)
      .then(rep => {
        const copie = rep.clone();
        caches.open(CACHE).then(c => c.put(req, copie));
        return rep;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
