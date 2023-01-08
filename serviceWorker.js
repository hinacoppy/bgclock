/* serviceWorker.js */
'use strict';

const CACHE_NAME = "bgclock-v20230108";
const ORIGIN = (location.hostname == 'localhost') ? '' : location.protocol + '//' + location.hostname;

const STATIC_FILES = [
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
  ORIGIN + '/js/BgUtil_class.js',
  ORIGIN + '/js/jquery-3.6.1.min.js',
  ORIGIN + '/js/jquery.mobile-events.min.js',
  ORIGIN + '/js/start-serviceWorker.js'
];

const CACHE_KEYS = [
  CACHE_NAME
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        STATIC_FILES.map(url => {
          return fetch(new Request(url, { cache: 'no-cache', mode: 'no-cors' })).then(response => {
            return cache.put(url, response);
          });
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => {
          return !CACHE_KEYS.includes(key);
        }).map(key => {
          return caches.delete(key);
        })
      );
    })
  );
});

