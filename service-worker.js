// 缓存版本号，更新时修改数字刷新缓存
const CACHE_VER = "AnsonFMv2026.1";

// 离线必须缓存的核心本地文件（相对路径）
const CACHE_FILES = [
  "./index.html",
  "./manifest.json",
  "./favicon.svg",
  "./favicon-96x96.png",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./web-app-manifest-192x192.png",
  "./web-app-manifest-512x512.png"
];

// 安装：预缓存核心文件
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VER).then((cache) => {
      return cache.addAll(CACHE_FILES);
    }).then(() => self.skipWaiting())
  );
});

// 激活：自动清理旧版本缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_VER)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求：优先本地缓存，断网自动兜底首页
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cacheRes) => {
      return cacheRes || fetch(req).catch(() => caches.match("./index.html"));
    })
  );
});
