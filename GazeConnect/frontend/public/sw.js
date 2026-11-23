/**
 * GazeConnect Progressive Web App (PWA) Service Worker
 * Enables 100% offline-first communication resilience.
 * Caches application shell, virtual keyboard assets, and MediaPipe WASM dependencies.
 */

const CACHE_NAME = "gazeconnect-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/communicate",
  "/dashboard",
  "/caregiver",
  "/auth",
  "/styles.css",
];

// MediaPipe WASM and model origins to cache on demand
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Pre-caching encountered non-critical error:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip caching for backend API calls or non-GET requests
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Cache-first for MediaPipe WASM / tasks-vision assets
  if (url.origin.includes("cdn.jsdelivr.net") || url.origin.includes("googleapis.com")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for app pages
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/communicate");
          }
          return new Response("Offline resource unavailable", { status: 503 });
        });
      })
  );
});
