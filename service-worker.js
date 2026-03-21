const CACHE_NAME = 'unadomot-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/vault/img/unadomot.jpg',
  '/styles/styles.css',
  '/styles/mobile.css',
  '/styles/desktop.css',
  '/styles/themes/dark.css',
  '/styles/themes/high-contrast.css',
  '/styles/themes/light.css',
  '/styles/accessibility-base.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => cache.addAll(PRECACHE_URLS))
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const isMessage = data.type === 'message' || (data.data && data.data.chatId);
    
    let options = {
      body: data.notification?.body || (isMessage ? 'New message' : 'Update from UnaDomot'),
      icon: '/vault/img/unadomot.jpg',
      badge: '/vault/img/unadomot.jpg',
      vibrate: [200, 100, 200],
      data: { ...data.data, type: isMessage ? 'message' : 'system' },
      actions: isMessage ? [
        { action: 'open-chat', title: '💬 Open Chat' },
        { action: 'close', title: 'Dismiss' }
      ] : [
        { action: 'open', title: 'View' },
        { action: 'close', title: 'Dismiss' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.notification?.title || (isMessage ? 'New Message' : 'UnaDomot'),
        options
      )
    );
  } catch (err) {
    console.error('Push error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  
  const data = event.notification.data;
  let url = '/';
  
  if (data?.type === 'message' && data?.chatId) {
    url = '/chat?chat=' + data.chatId;
  } else if (data?.listingId) {
    url = '/listing/' + data.listingId;
  } else if (data?.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(window.location.origin) && client.focus) {
          client.postMessage({ type: 'NAVIGATE', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ===== MAIN FETCH HANDLER WITH OFFLINE FALLBACK =====
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // For HTML navigation requests - serve offline page if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
      .catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }
  
  // For other requests - cache-first strategy
  event.respondWith(
    caches.match(event.request)
    .then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version and update in background
        event.waitUntil(updateCache(event.request));
        return cachedResponse;
      }
      return fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, response.clone());
              return response;
            });
        })
        .catch(() => {
          // If asset fails, return generic offline asset
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match('/vault/img/unadomot.jpg');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Helper to update cache in background
function updateCache(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return fetch(request).then(response => {
      return cache.put(request, response);
    });
  });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});