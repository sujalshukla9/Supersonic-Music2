// Supersonic Music Service Worker
// Purpose: Aggressive caching for audio tracks and thumbnails to support "Offline" feel and fast loading.

const CACHE_NAME = 'supersonic-v1';
const ASSET_CACHE = 'supersonic-assets';
const AUDIO_CACHE = 'supersonic-audio';
const IMAGE_CACHE = 'supersonic-images';

// Resources to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/logo.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(ASSET_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => ![ASSET_CACHE, AUDIO_CACHE, IMAGE_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Audio Streaming Caching (Fastest loading & Offline support)
    if (url.pathname.startsWith('/stream/') || url.href.includes('googlevideo.com')) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        console.log('[SW] ⚡ Serving song from cache:', url.pathname);
                        return response;
                    }
                    return fetch(event.request).then((networkResponse) => {
                        // Only cache if it's a full response (status 200)
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 2. Image Caching (Thumbnails)
    if (url.href.includes('ytimg.com') || url.href.includes('googleusercontent.com')) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    return response || fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 3. Default Stale-While-Revalidate for other assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse.ok) {
                    caches.open(ASSET_CACHE).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
