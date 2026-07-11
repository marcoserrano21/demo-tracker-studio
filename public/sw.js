// Service Worker for PWA - Enhanced Offline Support
const CACHE_NAME = 'demo-drive-hub-v3';
const OFFLINE_URL = '/offline.html';
const RUNTIME_CACHE = 'demo-drive-hub-runtime-v3';
const IMAGE_CACHE = 'demo-drive-hub-images-v3';

// Assets to cache immediately
const urlsToCache = [
  '/offline.html',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching essential assets');
      // Use addAll with error handling
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== IMAGE_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase, Firestore, and external API requests - let them pass through completely
  const url = event.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase.googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('google-analytics.com') ||
    url.includes('googleapis.com')
  ) {
    // Don't intercept Firebase requests at all
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache if request failed or returned an error status
          if (!response || response.status >= 400 || response.type === 'error') {
            return response;
          }

          // Only cache successful responses from our origin
          if (response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache images and static assets
          if (
            event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp|avif|woff|woff2|ttf)$/) ||
            event.request.url.includes('/_next/static/')
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(err => {
                console.warn('Failed to cache:', event.request.url, err);
              });
            });
          }

          return response;
        })
        .catch((error) => {
          console.warn('Fetch failed for:', event.request.url, error);
          // Network failed, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          // For other requests, just let the error propagate
          throw error;
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-vehicles') {
    event.waitUntil(syncVehicleData());
  }
});

async function syncVehicleData() {
  // This will be triggered when connection is restored
  console.log('Syncing vehicle data...');
  // Implementation handled by app
}
