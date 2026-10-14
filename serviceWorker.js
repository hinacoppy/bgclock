/* serviceWorker.js */
// (参考) https://developer.mozilla.org/ja/docs/Web/Progressive_web_apps/Offline_Service_workers
'use strict';

const cacheName = 'bgclock-v20261014';
const ORIGIN = location.origin; //ポート番号を含むorigin(LAN内IP:ポートなどでも動作させる)

const contentToCache = [
  ORIGIN + '/bgclock/',
  ORIGIN + '/bgclock/index.html',
  ORIGIN + '/bgclock/digital.html',
  ORIGIN + '/bgclock/analog.html',
  ORIGIN + '/bgclock/manifest-digital.json',
  ORIGIN + '/bgclock/manifest-analog.json',
  ORIGIN + '/bgclock/icon/digital/favicon.ico',
  ORIGIN + '/bgclock/icon/digital/apple-touch-icon.png',
  ORIGIN + '/bgclock/icon/digital/android-chrome-96x96.png',
  ORIGIN + '/bgclock/icon/digital/android-chrome-192x192.png',
  ORIGIN + '/bgclock/icon/digital/android-chrome-512x512.png',
  ORIGIN + '/bgclock/icon/analog/favicon.ico',
  ORIGIN + '/bgclock/icon/analog/apple-touch-icon.png',
  ORIGIN + '/bgclock/icon/analog/android-chrome-96x96.png',
  ORIGIN + '/bgclock/icon/analog/android-chrome-192x192.png',
  ORIGIN + '/bgclock/icon/analog/android-chrome-512x512.png',
  ORIGIN + '/bgclock/css/bgclock.css',
  ORIGIN + '/bgclock/js/BgClockApp_class.js',
  ORIGIN + '/bgclock/sounds/decision1.mp3',
  ORIGIN + '/bgclock/sounds/decision7.mp3',
  ORIGIN + '/bgclock/sounds/warning2.mp3',
  ORIGIN + '/bgclock/webfonts/DSEG7Classic-BoldItalic.woff',
  ORIGIN + '/bgScoreAppSvg/js/SevenSegment_class.js',
  ORIGIN + '/bgScoreAppSvg/js/RectanglePolygon_class.js',
  ORIGIN + '/bgScoreAppSvg/js/DotMatrix_class.js',
  ORIGIN + '/bgScoreAppSvg/js/FlipFont_class.js',
  ORIGIN + '/bgScoreAppSvg/js/Odometer_class.js',
  ORIGIN + '/bgScoreAppSvg/js/Handwritten_class.js',
  ORIGIN + '/bgScoreAppSvg/js/bgScoreAppSvg_class.js',
  ORIGIN + '/js/BgUtil_class.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(contentToCache);
    })
  );
  self.skipWaiting();
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      return r || fetch(e.request).then((response) => {
        //正常応答(200番台)かつhttp(s)のGETだけキャッシュする
        //(404/500のキャッシュ固定化や、chrome-extension: 等のエラーを防ぐ)
        if (response.ok && e.request.method === 'GET' && e.request.url.startsWith('http')) {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => Response.error()); //オフラインで未キャッシュの場合は通常のネットワークエラーとして扱う
    })
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        const [kyappname, kyversion] = key.split('-');
        const [cnappname, cnversion] = cacheName.split('-');
        if (kyappname === cnappname && kyversion !== cnversion) {
          return caches.delete(key);
        }
      }));
    })
  );
});
