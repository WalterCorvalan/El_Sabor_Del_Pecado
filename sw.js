// Service worker mínimo: solo existe para que el navegador permita instalar la app.
// No guarda nada en caché, así el menú y los precios siempre vienen frescos de la red.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
