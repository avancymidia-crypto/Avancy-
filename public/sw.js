/**
 * Service worker do Avancy.
 *
 * Estratégias, por tipo de requisição:
 *   - navegação  -> rede primeiro, cache como reserva (offline abre o app)
 *   - estáticos  -> cache primeiro (fontes, CSS, JS, ícones não mudam)
 *   - /api/*     -> rede primeiro, com a última resposta guardada como reserva
 *   - /auth/*    -> nunca passa pelo cache
 *
 * Ao publicar uma versão nova, mude CACHE_VERSION: o worker antigo limpa os
 * caches anteriores e assume o controle.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `avancy-shell-${CACHE_VERSION}`;
const DATA_CACHE = `avancy-data-${CACHE_VERSION}`;

/** Tudo que o app precisa para abrir sem rede. */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/app.css',
  '/assets/js/app.js',
  '/assets/avancy-logo-white.svg',
  '/assets/avancy-mark-beige.svg',
  '/assets/fonts/nunito-latin.woff2',
  '/assets/fonts/nunito-latin-ext.woff2',
  '/assets/fonts/raleway-latin.woff2',
  '/assets/fonts/raleway-latin-ext.woff2',
  '/assets/icons/icon-192.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // `addAll` falha inteiro se um item falhar; adiciona um a um para que
      // um asset ausente não impeça a instalação.
      .then((cache) => Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Rede primeiro; se falhar, devolve o que estiver no cache. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

/** Cache primeiro; busca na rede só se não tiver. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // O fluxo de OAuth nunca pode ser servido do cache.
  if (url.pathname.startsWith('/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request, DATA_CACHE).catch(
        () =>
          new Response(
            JSON.stringify({
              error: 'offline',
              message: 'Sem conexão e sem dados guardados para esta tela.'
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE).catch(() => caches.match(request)));
});
