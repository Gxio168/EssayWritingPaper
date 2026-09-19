/* Service Worker：PWA 离线支持。
 *
 * 本应用零后端、全部静态资源，策略很简单：
 * 1. install 时预缓存全部静态文件（带版本号 CACHE_NAME，改任何资源后递增）；
 * 2. fetch 对同源 GET 走 cache-first + 后台更新（stale-while-revalidate）：
 *    秒开为主，拿到新版本后放进缓存，下次刷新生效；
 * 3. activate 清掉旧版本缓存。
 *
 * 注意：全部用相对路径，兼容 GitHub Pages 的 /EssayWritingPaper/ 子路径部署。
 * localStorage 里的用户数据不经过 SW，不受任何影响。 */

const CACHE_NAME = 'shenlun-v1'

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/sidebar.css',
  './css/toolbar.css',
  './css/paper.css',
  './css/overlays.css',
  './css/responsive.css',
  './js/config.js',
  './js/state.js',
  './js/dom.js',
  './js/main.js',
  './js/lib/format.js',
  './js/lib/text.js',
  './js/ui/toast.js',
  './js/ui/drawer.js',
  './js/ui/dialog.js',
  './js/ui/clipboard.js',
  './js/ui/theme.js',
  './js/storage/store.js',
  './js/grid/build.js',
  './js/grid/render.js',
  './js/grid/engine.js',
  './js/grid/caret.js',
  './js/grid/undo.js',
  './js/grid/stat.js',
  './js/grid/resize.js',
  './js/paper/model.js',
  './js/paper/autosave.js',
  './js/paper/library.js',
  './js/paper/crud.js',
  './js/paper/header.js',
  './js/backup/transfer.js',
  './js/events/grid.js',
  './js/events/toolbar.js',
  './js/events/sidebar.js',
  './js/events/global.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
]

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(PRECACHE)
      })
      .then(function () {
        return self.skipWaiting()
      })
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE_NAME
            })
            .map(function (k) {
              return caches.delete(k)
            })
        )
      })
      .then(function () {
        return self.clients.claim()
      })
  )
})

self.addEventListener('fetch', function (event) {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        const network = fetch(req)
          .then(function (res) {
            if (res && res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(function () {
            // 离线且缓存未命中：导航请求回退到首页
            if (req.mode === 'navigate') return cache.match('./index.html')
            return undefined
          })
        return cached || network
      })
    })
  )
})
