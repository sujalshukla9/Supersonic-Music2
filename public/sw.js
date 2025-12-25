// Supersonic Music Service Worker v2
// Full offline support with intelligent caching strategies

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `supersonic-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `supersonic-dynamic-${CACHE_VERSION}`;
const AUDIO_CACHE = 'supersonic-audio';
const IMAGE_CACHE = 'supersonic-images';

// App shell - critical assets to cache immediately for offline loading
const APP_SHELL = [
    '/',
    '/index.html',
    '/logo.png',
    '/manifest.json'
];

// Install: Cache app shell for offline access
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(APP_SHELL);
            })
            .then(() => {
                console.log('[SW] ✅ App shell cached');
                return self.skipWaiting();
            })
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => {
                        // Keep current version caches and persistent caches
                        return key !== STATIC_CACHE &&
                            key !== DYNAMIC_CACHE &&
                            key !== AUDIO_CACHE &&
                            key !== IMAGE_CACHE;
                    })
                    .map((key) => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            console.log('[SW] ✅ Activated');
            return self.clients.claim();
        })
    );
});

// Fetch: Smart caching strategies
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const request = event.request;

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Strategy 1: Audio Streaming - Cache First, Network Fallback
    if (url.pathname.startsWith('/stream/') ||
        url.pathname.startsWith('/extract/') ||
        url.href.includes('googlevideo.com')) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('[SW] ⚡ Audio from cache:', url.pathname);
                        return cachedResponse;
                    }
                    return fetch(request).then((networkResponse) => {
                        // Only cache successful full responses
                        if (networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Return empty response if offline and not cached
                        return new Response('Audio not available offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                });
            })
        );
        return;
    }

    // Strategy 2: Images (thumbnails) - Stale While Revalidate
    if (url.href.includes('ytimg.com') ||
        url.href.includes('googleusercontent.com') ||
        url.href.includes('ggpht.com') ||
        request.destination === 'image') {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    const fetchPromise = fetch(request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse);

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Strategy 3: API requests - Network First, Cache Fallback
    if (url.pathname.startsWith('/api/') ||
        url.hostname.includes('localhost:3001') ||
        url.hostname.includes('api.')) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    // Cache successful API responses for offline use
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Try to serve from cache when offline
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('[SW] 📦 API from cache:', url.pathname);
                            return cachedResponse;
                        }
                        // Return offline JSON response
                        return new Response(
                            JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
                            {
                                status: 503,
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    });
                })
        );
        return;
    }

    // Strategy 4: Navigation requests (HTML pages) - Network First with Offline Fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    // Cache the page for offline access
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // Serve cached page or fallback to app shell
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Fallback to cached index.html for SPA routing
                        return caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // Strategy 5: Static assets (JS, CSS, fonts) - Cache First, Network Fallback
    if (request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.woff')) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Serve from cache immediately
                    // Also update cache in background
                    fetch(request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            caches.open(STATIC_CACHE).then((cache) => {
                                cache.put(request, networkResponse);
                            });
                        }
                    }).catch(() => { });
                    return cachedResponse;
                }
                // Not in cache, fetch and cache
                return fetch(request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Return empty response for missing assets
                    return new Response('', { status: 503 });
                });
            })
        );
        return;
    }

    // Strategy 6: Default - Stale While Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse.ok) {
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If fetch fails, return cached response or nothing
                return cachedResponse || new Response('Offline', { status: 503 });
            });

            // Return cached response immediately, update in background
            return cachedResponse || fetchPromise;
        })
    );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_AUDIO_CACHE') {
        caches.delete(AUDIO_CACHE).then(() => {
            console.log('[SW] Audio cache cleared');
        });
    }

    if (event.data && event.data.type === 'CACHE_AUDIO') {
        const audioUrl = event.data.url;
        caches.open(AUDIO_CACHE).then((cache) => {
            fetch(audioUrl).then((response) => {
                if (response.ok) {
                    cache.put(audioUrl, response);
                    console.log('[SW] Audio cached:', audioUrl);
                }
            });
        });
    }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-plays') {
        event.waitUntil(syncPlayHistory());
    }
});

async function syncPlayHistory() {
    // This would sync any pending play history when back online
    console.log('[SW] Syncing play history...');
}

console.log('[SW] Supersonic Service Worker loaded');
