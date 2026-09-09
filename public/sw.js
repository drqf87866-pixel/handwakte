/**
 * Service Worker der Digitalen Bauakte (hand-rolled, keine Dependency).
 *
 * Aufgabe: Den Monteur-Flow (/scan, /anlage/*, /protokoll/*) auch im Keller
 * ohne Empfang lesbar halten. Strategie:
 *
 * - App-Shell beim Install precachen (Version-Key, alte Caches fliegen beim
 *   Activate raus).
 * - /_next/static/* und GET /api/files/*: Cache-First (gehashte Dateinamen
 *   bzw. unveraenderliche R2-Objekte).
 * - Monteur-Seiten (HTML + RSC, gleiche URL): Network-First mit
 *   Cache-Fallback - zuletzt besuchte Bauakten sind offline lesbar.
 * - Alle anderen Navigationen: Netzwerk, sonst /offline-Fehlerseite.
 *
 * Nicht angefasst: alles ausser GET, fremde Origins, POST /api/upload und
 * Server Actions (sie laufen nur mit Netz; Offline-Erfassung legt dafuer in
 * IndexedDB ab und /sync spielt es spaeter ein).
 */

// Bei jeder Aenderung an den Strategien oder der Shell hochzaehlen.
const VERSION = "bauakte-v1";

// Bewusst ohne /scan und /sync: Sie brauchen eine Session, und der Precache
// wuerde sonst beim ausgeloggten Install die Login-Seite unter ihrer URL
// ablegen. Ihr Inhalt kommt ueber den Runtime-Cache (Network-First) nach dem
// ersten Besuch mit Empfang.
const SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const STATISCH = /^\/_next\/static\//;
const DATEIEN = /^\/api\/files\//;
const MONTEUR_SEITE = /^\/(anlage\/[^/]+|protokoll\/[^/]+|scan)\/?$/;

// Bremse gegen unbegrenzt wachsende Runtime-Caches (pro Cache).
const MAX_RUNTIME_EINTRAEGE = 100;

async function cacheBeschneiden(cacheName) {
  const cache = await caches.open(cacheName);
  const schluessel = await cache.keys();
  if (schluessel.length > MAX_RUNTIME_EINTRAEGE) {
    await cache.delete(schluessel[0]);
  }
}

async function cacheFirst(anfrage) {
  const treffer = await caches.match(anfrage);
  if (treffer) return treffer;

  const antwort = await fetch(anfrage);
  if (antwort.ok) {
    const cache = await caches.open(VERSION);
    await cache.put(anfrage, antwort.clone());
    await cacheBeschneiden(VERSION);
  }
  return antwort;
}

async function networkFirst(anfrage, fallbackSeite) {
  try {
    const antwort = await fetch(anfrage);
    if (antwort.ok) {
      const cache = await caches.open(VERSION);
      await cache.put(anfrage, antwort.clone());
      await cacheBeschneiden(VERSION);
    }
    return antwort;
  } catch (fehler) {
    const treffer = await caches.match(anfrage);
    if (treffer) return treffer;
    if (fallbackSeite) {
      const seite = await caches.match("/offline");
      if (seite) return seite;
    }
    throw fehler;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) =>
        Promise.all(namen.filter((name) => name !== VERSION).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nur eigene GET-Anfragen - alles andere (POST, fremde Origins) laeuft durch.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  const pfad = url.pathname;

  if (STATISCH.test(pfad) || DATEIEN.test(pfad)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (pfad === "/" || MONTEUR_SEITE.test(pfad)) {
    event.respondWith(networkFirst(event.request, true));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline")));
  }
});
