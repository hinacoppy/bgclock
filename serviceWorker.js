/* serviceWorker.js */
// (参考) https://developer.mozilla.org/ja/docs/Web/Progressive_web_apps/Offline_Service_workers
'use strict';

const cacheName = 'bgclock-v20240611';
const ORIGIN = (location.hostname == 'localhost') ? '' : location.protocol + '//' + location.hostname;

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
  ORIGIN + '/bgscoreapp/js/bgflipcard_class.js',
  ORIGIN + '/bgscoreapp/js/swipetracker_class.js',
  ORIGIN + '/js/BgUtil_class.js',
  ORIGIN + '/js/jquery-3.7.1.min.js',
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
        return caches.open(cacheName).then((cache) => {
          if (e.request.url.startsWith('http')) { //ignore chrome-extention: request (refuse error msg)
            cache.put(e.request, response.clone());
          }
          return response;
        });
      });
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
