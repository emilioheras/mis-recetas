// Service worker mínimo.
// Su única misión es cumplir el criterio de Chrome para que el navegador
// ofrezca "Instalar Mis Recetas" en lugar de solo "Añadir a pantalla de
// inicio". No cachea nada: cada petición va directa a la red, así que
// no puede dejar la app obsoleta tras un deploy.

self.addEventListener("install", () => {
  // Activa el SW nuevo en cuanto se instala (sin esperar a que se cierren
  // todas las pestañas). Importante para que las actualizaciones lleguen
  // rápido al usuario.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Toma control inmediato de las páginas ya abiertas.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pasa la petición tal cual a la red. Chrome necesita ver un handler de
  // fetch registrado para considerar la app "instalable".
  event.respondWith(fetch(event.request));
});
