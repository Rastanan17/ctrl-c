let registrationStarted = false;

export function registerServiceWorker() {
  if (registrationStarted) {
    return;
  }

  registrationStarted = true;

  if (!('serviceWorker' in navigator)) {
    console.info(
      'Este navegador no admite Service Workers.'
    );

    return;
  }

  /*
   * Los Service Workers funcionan en:
   *
   * - HTTPS
   * - GitHub Pages
   * - localhost o Live Server
   *
   * No funcionan correctamente abriendo index.html
   * directamente mediante file://
   */
  if (window.location.protocol === 'file:') {
    console.warn(
      'Usá Live Server para probar el Service Worker.'
    );

    return;
  }

  if (document.readyState === 'complete') {
    startRegistration();
  } else {
    window.addEventListener(
      'load',
      startRegistration,
      {
        once: true
      }
    );
  }
}

async function startRegistration() {
  try {
    /*
     * Eliminamos el registro antiguo que apuntaba
     * a js/sw.js, en caso de que alguna versión
     * anterior de Ctrl+C lo haya instalado.
     */
    await removeLegacyRegistration();

    /*
     * sw.js se encuentra en la raíz del proyecto.
     *
     * En GitHub Pages se resolverá como:
     * /ctrl-c/sw.js
     */
    const serviceWorkerUrl = new URL(
      './sw.js',
      document.baseURI
    );

    const registration =
      await navigator.serviceWorker.register(
        serviceWorkerUrl,
        {
          scope: './'
        }
      );

    console.info(
      'Service Worker registrado:',
      registration.scope
    );

    watchForUpdates(registration);

    /*
     * Verificamos si existe una versión nueva.
     * Si el dispositivo está sin conexión,
     * el error se ignora.
     */
    registration.update().catch(() => {});
  } catch (error) {
    console.warn(
      'No se pudo registrar el Service Worker:',
      error
    );
  }
}

async function removeLegacyRegistration() {
  try {
    const registrations =
      await navigator.serviceWorker
        .getRegistrations();

    const legacyUrl = new URL(
      './js/sw.js',
      document.baseURI
    ).href;

    const legacyRegistrations =
      registrations.filter(registration => {
        return (
          registration.active?.scriptURL ===
            legacyUrl ||
          registration.waiting?.scriptURL ===
            legacyUrl ||
          registration.installing?.scriptURL ===
            legacyUrl
        );
      });

    await Promise.all(
      legacyRegistrations.map(
        registration => {
          console.info(
            'Eliminando Service Worker antiguo:',
            legacyUrl
          );

          return registration.unregister();
        }
      )
    );
  } catch (error) {
    console.warn(
      'No se pudo revisar el Service Worker antiguo:',
      error
    );
  }
}

function watchForUpdates(registration) {
  registration.addEventListener(
    'updatefound',
    () => {
      const installingWorker =
        registration.installing;

      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener(
        'statechange',
        () => {
          if (
            installingWorker.state ===
              'installed' &&
            navigator.serviceWorker.controller
          ) {
            console.info(
              'Hay una nueva versión de Ctrl+C disponible.'
            );

            window.dispatchEvent(
              new CustomEvent(
                'ctrlc:update-available'
              )
            );
          }
        }
      );
    }
  );
}