/**
 * Servidor do app Avancy.
 *
 * Serve a interface (PWA) e a API que ela consome. Os tokens da Meta ficam
 * apenas aqui — o navegador nunca os vê.
 */

import path from 'node:path';
import express from 'express';

import { config, validateConfig } from './config.js';
import { sessionMiddleware, store } from './session.js';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';
import { usingMockData } from './providers/index.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '32kb' }));
app.use(sessionMiddleware);

/** Cabeçalhos de segurança. A CSP permite só o que o app realmente usa. */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      // As fotos de perfil e miniaturas do Instagram vêm da CDN da Meta.
      "img-src 'self' data: https://*.cdninstagram.com https://*.fbcdn.net",
      "connect-src 'self'",
      "form-action 'self' https://www.facebook.com",
      "frame-ancestors 'self'",
      "base-uri 'self'"
    ].join('; ')
  );
  next();
});

app.use('/auth', authRouter);
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ ok: true, provider: usingMockData ? 'mock' : 'instagram' });
});

/**
 * Arquivos estáticos. O service worker e o manifesto não podem ficar em cache
 * longo, senão o app trava numa versão antiga.
 */
const publicDir = path.join(config.rootDir, 'public');

app.use(
  express.static(publicDir, {
    index: 'index.html',
    maxAge: config.isProduction ? '1y' : 0,
    setHeaders(res, filePath) {
      const name = path.basename(filePath);
      if (name === 'sw.js' || name === 'manifest.webmanifest' || name === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  })
);

/** Qualquer outra rota devolve o app (navegação client-side). */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'), (err) => (err ? next(err) : undefined));
});

/** Tratamento de erro uniforme: JSON para a API, redirect para navegação. */
app.use((error, req, res, _next) => {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(`[erro] ${req.method} ${req.path}:`, error.message);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      error: error.code || 'server_error',
      message: status >= 500 ? 'Erro interno. Tente de novo.' : error.message
    });
  }

  res.redirect(`/?error=${encodeURIComponent(error.message || 'Algo deu errado.')}`);
});

const problems = validateConfig();
if (problems.length) {
  console.warn('Avisos de configuração:');
  for (const problem of problems) console.warn(`  - ${problem}`);
}

// Limpa sessões vencidas de hora em hora.
const pruneTimer = setInterval(() => store.prune(), 60 * 60 * 1000);
pruneTimer.unref();

const server = app.listen(config.port, () => {
  console.log(`Avancy rodando em ${config.publicUrl}`);
  console.log(`Origem dos dados: ${usingMockData ? 'simulados (mock)' : 'Instagram Graph API'}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
