'use strict';

/*
 * Cada vez que modifiquemos archivos importantes
 * de la aplicación, aumentaremos esta versión.
 *
 * Ejemplo:
 * ctrl-c-v6
 * ctrl-c-v7
 */
const CACHE_NAME = 'ctrl-c-v6';

const CACHE_PREFIX = 'ctrl-c-';

/*
 * Archivos principales necesarios para que la
 * aplicación funcione sin conexión.
 */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',

  './css/styles.css',

  './js/app.js',
  './js/backup.js',
  './js/business.js',
  './js/calculations.js',
  './js/clients.js',
  './js/config.js',
  './js/deliveries.js',
  './js/products.js',
  './js/reports.js',
  './js/service-worker.js',
  './js/state.js',
  './js/ui.js',
  './js/utils.js',
  './js/whatsapp.js',

  './images/ctrl-icon.png',
  './images/ctrl.jpg',
  './images/ctrl.png',
  './images/icon.svg'
];

/*
 * Instalación:
 * guardamos los archivos principales.
 */
self.addEventListener(
  'install',
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache => {
          return cache.addAll(APP_SHELL);
        })
        .then(() => {
          return self.skipWaiting();
        })
    );
  }
);

/*
 * Activación:
 * eliminamos versiones anteriores del caché.
 */
self.addEventListener(
  'activate',
  event => {
    event.waitUntil(
      caches
        .keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              const belongsToCtrlC =
                cacheName.startsWith(
                  CACHE_PREFIX
                );

              const isCurrentCache =
                cacheName === CACHE_NAME;

              if (
                belongsToCtrlC &&
                !isCurrentCache
              ) {
                return caches.delete(
                  cacheName
                );
              }

              return Promise.resolve(false);
            })
          );
        })
        .then(() => {
          return self.clients.claim();
        })
    );
  }
);

/*
 * Peticiones:
 *
 * - Navegaciones HTML: primero internet.
 * - Archivos estáticos: primero caché.
 * - Peticiones externas: no se interceptan.
 */
self.addEventListener(
  'fetch',
  event => {
    const request = event.request;

    if (request.method !== 'GET') {
      return;
    }

    /*
     * Evita un error particular de Chrome
     * con algunas peticiones internas.
     */
    if (
      request.cache === 'only-if-cached' &&
      request.mode !== 'same-origin'
    ) {
      return;
    }

    const requestUrl = new URL(
      request.url
    );

    if (
      requestUrl.origin !==
      self.location.origin
    ) {
      return;
    }

    const isDocumentRequest =
      request.mode === 'navigate' ||
      request.destination === 'document' ||
      requestUrl.pathname.endsWith('/') ||
      requestUrl.pathname.endsWith('.html');

    if (isDocumentRequest) {
      event.respondWith(
        networkFirstNavigation(request)
      );

      return;
    }

    event.respondWith(
      cacheFirst(request)
    );
  }
);

async function networkFirstNavigation(
  request
) {
  try {
    const networkResponse =
      await fetch(request);

    if (
      networkResponse &&
      networkResponse.ok
    ) {
      const cache = await caches.open(
        CACHE_NAME
      );

      await cache.put(
        './index.html',
        networkResponse.clone()
      );
    }

    return networkResponse;
  } catch (error) {
    const requestedPage =
      await caches.match(
        request,
        {
          ignoreSearch: true
        }
      );

    if (requestedPage) {
      return requestedPage;
    }

    const cachedIndex =
      await caches.match(
        './index.html',
        {
          ignoreSearch: true
        }
      );

    if (cachedIndex) {
      return cachedIndex;
    }

    const cachedRoot =
      await caches.match(
        './',
        {
          ignoreSearch: true
        }
      );

    if (cachedRoot) {
      return cachedRoot;
    }

    return new Response(
      offlinePageHtml(),
      {
        status: 503,

        statusText: 'Offline',

        headers: {
          'Content-Type':
            'text/html; charset=utf-8'
        }
      }
    );
  }
}

async function cacheFirst(request) {
  const cachedResponse =
    await caches.match(
      request,
      {
        ignoreSearch: true
      }
    );

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse =
      await fetch(request);

    if (
      networkResponse &&
      networkResponse.ok
    ) {
      const cache = await caches.open(
        CACHE_NAME
      );

      await cache.put(
        request,
        networkResponse.clone()
      );
    }

    return networkResponse;
  } catch (error) {
    console.warn(
      'No se pudo cargar:',
      request.url
    );

    return Response.error();
  }
}

function offlinePageHtml() {
  return `
    <!doctype html>

    <html lang="es">
      <head>
        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

        <title>Ctrl+C · Sin conexión</title>

        <style>
          body {
            min-height: 100vh;
            margin: 0;
            display: grid;
            place-items: center;
            padding: 24px;
            box-sizing: border-box;
            background: #f4f6f9;
            color: #172033;
            font-family:
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .offline {
            width: min(420px, 100%);
            padding: 28px;
            box-sizing: border-box;
            border: 1px solid #dfe4ec;
            border-radius: 20px;
            background: #ffffff;
            text-align: center;
            box-shadow:
              0 16px 40px
              rgba(23, 70, 162, 0.12);
          }

          h1 {
            margin: 0 0 10px;
            color: #1746a2;
          }

          p {
            margin: 0 0 20px;
            color: #677184;
            line-height: 1.5;
          }

          button {
            min-height: 44px;
            padding: 10px 18px;
            border: 0;
            border-radius: 12px;
            background: #1746a2;
            color: #ffffff;
            font: inherit;
            font-weight: 800;
            cursor: pointer;
          }
        </style>
      </head>

      <body>
        <main class="offline">
          <h1>Ctrl+C</h1>

          <p>
            No hay conexión y todavía no pudimos
            cargar la aplicación desde el dispositivo.
          </p>

          <button
            type="button"
            onclick="location.reload()"
          >
            Volver a intentar
          </button>
        </main>
      </body>
    </html>
  `;
}