/**
 * Gera um build estático de demonstração: um único HTML que roda sem servidor.
 *
 * Serve para apresentar o app — um link que abre na hora, sem hibernação, sem
 * login, sem depender de hospedagem. NÃO substitui o app: é o mesmo frontend,
 * mas com as respostas da API congeladas.
 *
 * O ponto importante é que as respostas são CAPTURADAS do servidor rodando em
 * modo simulado, não reescritas à mão. Assim a demonstração não descola do que
 * o app realmente produz — se a fórmula do score mudar, basta rodar de novo.
 *
 * Uso:
 *   npm start                  (noutro terminal, em modo mock)
 *   node scripts/build-demo.js [http://localhost:3000] [saída.html]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(rootDir, 'public');

const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const outFile = process.argv[3] || path.join(rootDir, 'demo', 'avancy-demo.html');

const PERIODS = ['7', '30', '90'];
const FORMATS = ['todos', 'reels', 'carrossel', 'foto'];
const SORTS = ['desc', 'asc'];

/** Cookie de sessão, obtido do fluxo de conexão simulado. */
let cookie = '';

async function api(pathname) {
  const response = await fetch(baseUrl + pathname, { headers: { Cookie: cookie } });
  if (!response.ok) throw new Error(`${pathname} devolveu HTTP ${response.status}`);
  return response.json();
}

async function connect() {
  const response = await fetch(`${baseUrl}/auth/instagram`, { redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error('O servidor não devolveu cookie de sessão. Está em modo mock?');
  cookie = setCookie.split(';')[0];
}

/** Percorre tudo que a interface pode pedir e guarda cada resposta. */
async function capture() {
  const snapshot = {};
  const record = async (pathname) => {
    snapshot[pathname] = await api(pathname);
  };

  await record('/api/me');
  await record('/api/notifications');
  await record('/api/settings');

  for (const period of PERIODS) {
    await record(`/api/overview?period=${period}`);

    for (const format of FORMATS) {
      for (const sort of SORTS) {
        await record(`/api/posts?period=${period}&format=${format}&sort=${sort}`);
      }
    }

    // Detalhe de cada publicação que aparece naquele período.
    const { posts } = snapshot[`/api/posts?period=${period}&format=todos&sort=desc`];
    for (const post of posts) {
      await record(`/api/posts/${encodeURIComponent(post.id)}?period=${period}`);
    }
  }

  return snapshot;
}

const MIME = {
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

async function dataUri(relativePath) {
  const file = path.join(publicDir, relativePath);
  const buffer = await fs.readFile(file);
  const mime = MIME[path.extname(file)] || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Camada que substitui o servidor: intercepta fetch e a navegação do OAuth.
 * Fica fora do app.js — o frontend não sabe que está numa demonstração, tirando
 * o gancho `__avancyRedirect`.
 */
function shim(snapshot) {
  return `
<script>
(function () {
  var SNAPSHOT = ${JSON.stringify(snapshot)};
  var KEY = 'avancy-demo-conectado';

  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  var realFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var pathname = url.replace(/^https?:\\/\\/[^/]+/, '');

    if (pathname === '/auth/logout') {
      sessionStorage.removeItem(KEY);
      return json({ ok: true });
    }

    if (pathname === '/api/me') {
      var me = SNAPSHOT['/api/me'];
      if (sessionStorage.getItem(KEY) !== '1') {
        return json({ connected: false, simulated: true, periods: me.periods });
      }
      return json(me);
    }

    if (pathname.indexOf('/api/') === 0) {
      if (sessionStorage.getItem(KEY) !== '1') {
        return json({ error: 'not_connected', message: 'Conta não conectada.' }, 401);
      }
      if (SNAPSHOT[pathname]) return json(SNAPSHOT[pathname]);
      return json({ error: 'not_found', message: 'Esta tela não faz parte da demonstração.' }, 404);
    }

    return realFetch(input, init);
  };

  // O botão conectar faria uma navegação de página inteira para o OAuth.
  // Aqui ele marca a sessão e recarrega, imitando a volta do redirecionamento.
  window.__avancyRedirect = function (url) {
    if (url.indexOf('/auth/instagram') === 0) {
      sessionStorage.setItem(KEY, '1');
      setTimeout(function () { location.reload(); }, 1100);
    }
  };

  // Não há service worker num arquivo estático.
  if ('serviceWorker' in navigator) {
    try {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: function () { return Promise.reject(new Error('demo estática')); },
                 getRegistration: function () { return Promise.resolve(undefined); } },
        configurable: true
      });
    } catch (e) { /* ignora */ }
  }
})();
</script>`;
}

async function build() {
  console.log(`Capturando as respostas de ${baseUrl} …`);
  await connect();
  const snapshot = await capture();
  console.log(`  ${Object.keys(snapshot).length} respostas guardadas`);

  let html = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
  const css = await fs.readFile(path.join(publicDir, 'assets/css/app.css'), 'utf8');
  const js = await fs.readFile(path.join(publicDir, 'assets/js/app.js'), 'utf8');

  // Fontes e imagens viram data URI para o arquivo bastar-se sozinho.
  let inlinedCss = css;
  for (const match of css.matchAll(/url\('\.\.\/fonts\/([^']+)'\)/g)) {
    inlinedCss = inlinedCss.replace(match[0], `url('${await dataUri(`assets/fonts/${match[1]}`)}')`);
  }

  const logo = await dataUri('assets/avancy-logo-white.svg');
  const mark = await dataUri('assets/avancy-mark-beige.svg');
  const inlinedJs = js
    .split('/assets/avancy-logo-white.svg').join(logo)
    .split('/assets/avancy-mark-beige.svg').join(mark);

  html = html
    .replace(/\s*<link rel="preload"[^>]*>/g, '')
    .replace(/\s*<link rel="manifest"[^>]*>/, '')
    .replace('<link rel="stylesheet" href="/assets/css/app.css">', `<style>\n${inlinedCss}\n</style>`)
    .replace('<script src="/assets/js/app.js"></script>', `${shim(snapshot)}\n<script>\n${inlinedJs}\n</script>`)
    .split('/assets/avancy-mark-beige.svg').join(mark)
    .split('/assets/avancy-logo-white.svg').join(logo)
    .replace('<link rel="apple-touch-icon" href="/assets/icons/icon-192.png">', '');

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, html, 'utf8');

  const kb = Math.round((await fs.stat(outFile)).size / 1024);
  console.log(`Gerado: ${outFile} (${kb} KB)`);

  const remaining = [...html.matchAll(/(?:src|href)="(?!data:|#)([^"]+)"/g)].map((m) => m[1]);
  if (remaining.length) console.warn('Referências externas restantes:', remaining);
}

build().catch((error) => {
  console.error('Falhou:', error.message);
  process.exit(1);
});
