/**
 * Rotas de conexão da conta.
 *
 * Com DATA_PROVIDER=mock não há ida à Meta: a conexão é simulada para que o
 * app inteiro possa ser usado sem credenciais. Com `instagram`, roda o OAuth
 * de verdade.
 */

import express from 'express';
import { config } from '../config.js';
import { usingMockData, provider } from '../providers/index.js';
import { authorizeUrl, createState, completeOAuth, MetaAuthError } from '../auth/meta-oauth.js';

export const authRouter = express.Router();

/** Estados de OAuth pendentes: state -> quando foi criado. */
const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function rememberState(state) {
  pendingStates.set(state, Date.now());

  // Limpeza oportunista dos vencidos.
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const [key, createdAt] of pendingStates) {
    if (createdAt < cutoff) pendingStates.delete(key);
  }
}

function consumeState(state) {
  const createdAt = pendingStates.get(state);
  if (createdAt === undefined) return false;

  pendingStates.delete(state);
  return createdAt >= Date.now() - STATE_TTL_MS;
}

/** Inicia a conexão. */
authRouter.get('/instagram', async (req, res, next) => {
  if (usingMockData) {
    // Modo simulado: cria a sessão direto, sem sair do app.
    const account = await provider.getAccount();
    req.startSession({ account, connectedAt: Date.now(), simulated: true });
    return res.redirect('/?connected=1');
  }

  if (!config.meta.appId || !config.meta.appSecret) {
    return next(
      new MetaAuthError(
        'O app não está configurado para falar com a Meta. Faltam META_APP_ID e META_APP_SECRET.',
        { status: 500 }
      )
    );
  }

  const state = createState();
  rememberState(state);
  res.redirect(authorizeUrl(state));
});

/** Retorno do diálogo de autorização da Meta. */
authRouter.get('/instagram/callback', async (req, res, next) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  // O usuário pode ter recusado a autorização.
  if (error) {
    const reason = encodeURIComponent(errorDescription || 'Autorização cancelada.');
    return res.redirect(`/?error=${reason}`);
  }

  if (!code || !state) {
    return next(new MetaAuthError('Retorno inválido da Meta.', { status: 400 }));
  }

  if (!consumeState(String(state))) {
    return next(
      new MetaAuthError('A tentativa de conexão expirou ou é inválida. Comece de novo.', {
        status: 400
      })
    );
  }

  try {
    const { userAccessToken, tokenExpiresAt, account } = await completeOAuth(String(code));

    req.startSession({
      account,
      userAccessToken,
      tokenExpiresAt,
      connectedAt: Date.now(),
      simulated: false
    });

    res.redirect('/?connected=1');
  } catch (err) {
    next(err);
  }
});

/** Desconecta a conta. */
authRouter.post('/logout', (req, res) => {
  req.destroySession();
  res.json({ ok: true });
});
