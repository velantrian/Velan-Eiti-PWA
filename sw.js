// sw.js — Velan Eiti Service Worker v1.7.0
const CACHE_NAME = 'velan-eiti-v1.7.0';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-48x48.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-180x180.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-512x512.png',
  OFFLINE_URL,
];

// ── Install: кэшируем статику ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: удаляем старые кэши и захватываем клиентов ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first для index.html, cache-first для остального ────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API-запросы к внешним провайдерам — только через сеть
  const apiHosts = ['api.deepseek.com', 'api.anthropic.com', 'api.openai.com',
                    'api.groq.com', 'openrouter.ai'];
  if (apiHosts.some(h => url.hostname.includes(h))) {
    return; // не перехватываем
  }

  // Ollama localhost — прямой проход (офлайн-режим)
  if (url.hostname === 'localhost' && url.port === '11434') {
    return;
  }

  // Streamlit dev-сервер — network first
  if (url.hostname === 'localhost' && (url.port === '8501' || url.port === '8502')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // index.html и корневой путь — network-first (чтобы обновления применялись сразу)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  // Остальная статика — cache first, fallback network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
      });
    })
  );
});

// ── Background Sync — агент уведомляет о завершении задачи ────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'agent-task-complete') {
    event.waitUntil(notifyAgentComplete());
  }
});

async function notifyAgentComplete() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'AGENT_COMPLETE' }));
}

// ── Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || '⚡ Velan Eiti', {
      body: data.body || 'Агент завершил задачу',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'agent-notification',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
