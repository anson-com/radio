// service-worker.js - AnsonFM 基础缓存
const CACHE_NAME = 'ansonfm-v1';

// 需要预缓存的静态资源（核心骨架）
const urlsToCache = [
  '/radio/',
  '/radio/index.html',
  '/radio/manifest.json',
  '/radio/favicon.ico',
  '/radio/favicon.svg',
  '/radio/favicon-96x96.png',
  '/radio/apple-touch-icon.png',
  '/radio/web-app-manifest-192x192.png',
  '/radio/web-app-manifest-512x512.png'
];

// 安装阶段：预缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 预缓存成功');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('[SW] 缓存失败:', err))
  );
  self.skipWaiting(); // 立即激活
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 拦截请求：优先缓存，网络回退（对音频流直连，不缓存）
self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // 🔥 跳过音频流（m3u8/mp3 等），避免错误缓存
  if (requestUrl.includes('.m3u8') || requestUrl.includes('.mp3') || 
      requestUrl.includes('stream') || requestUrl.includes('live')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 对 HTML/CSS/JS/图标等静态资源，优先用缓存
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // 缓存命中
        }
        // 网络请求并更新缓存（可选）
        return fetch(event.request).then(networkResponse => {
          // 只缓存成功的响应（非音频）
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        }).catch(() => {
          // 离线时显示自定义页面（可选）
          return new Response('网络已断开，请检查连接', { status: 503 });
        });
      })
  );
});