/**
 * OAuth da Meta (Facebook Login) para acesso à Instagram Graph API.
 *
 * O fluxo completo:
 *   1. redireciona o usuário para o diálogo de autorização da Meta
 *   2. a Meta devolve um `code` no callback
 *   3. troca o `code` por um token de curta duração (~1h)
 *   4. troca o de curta por um de longa duração (~60 dias)
 *   5. lista as Páginas do Facebook do usuário e encontra a conta
 *      profissional do Instagram vinculada a uma delas
 *
 * O passo 5 é o que costuma falhar na prática: só existe conta do Instagram
 * acessível pela API se ela for Business ou Creator E estiver vinculada a uma
 * Página. É por isso que a tela de conexão do app avisa sobre isso.
 */

import crypto from 'node:crypto';
import { config } from '../config.js';

const graph = (path) => `https://graph.facebook.com/${config.meta.apiVersion}${path}`;

export class MetaAuthError extends Error {
  constructor(message, { status = 502, cause } = {}) {
    super(message);
    this.name = 'MetaAuthError';
    this.status = status;
    this.cause = cause;
  }
}

/** GET no Graph com tratamento uniforme de erro. */
async function graphGet(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new MetaAuthError('Não foi possível falar com a API da Meta.', { cause });
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    const detail = body?.error?.message || `HTTP ${response.status}`;
    throw new MetaAuthError(`A Meta recusou a requisição: ${detail}`, {
      status: response.status === 400 ? 400 : 502
    });
  }
  return body;
}

/** Valor opaco que amarra o callback ao início do fluxo (proteção CSRF). */
export function createState() {
  return crypto.randomBytes(16).toString('base64url');
}

/** URL do diálogo de autorização. */
export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    redirect_uri: config.meta.redirectUri,
    state,
    response_type: 'code',
    scope: config.meta.scopes.join(',')
  });
  return `https://www.facebook.com/${config.meta.apiVersion}/dialog/oauth?${params}`;
}

/** Passo 3 — `code` vira token de curta duração. */
async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    client_secret: config.meta.appSecret,
    redirect_uri: config.meta.redirectUri,
    code
  });

  const body = await graphGet(graph(`/oauth/access_token?${params}`));
  if (!body.access_token) throw new MetaAuthError('A Meta não devolveu um token.');
  return body.access_token;
}

/** Passo 4 — curta duração vira longa duração (~60 dias). */
async function exchangeForLongLived(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.meta.appId,
    client_secret: config.meta.appSecret,
    fb_exchange_token: shortLivedToken
  });

  const body = await graphGet(graph(`/oauth/access_token?${params}`));
  return {
    accessToken: body.access_token || shortLivedToken,
    // `expires_in` vem em segundos; ausente significa que não expira sozinho.
    expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : null
  };
}

/** Passo 5 — encontra a conta profissional do Instagram vinculada a uma Página. */
async function findInstagramAccount(userToken) {
  const params = new URLSearchParams({
    access_token: userToken,
    fields: 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}'
  });

  const body = await graphGet(graph(`/me/accounts?${params}`));
  const pages = Array.isArray(body.data) ? body.data : [];
  const page = pages.find((p) => p.instagram_business_account);

  if (!page) {
    throw new MetaAuthError(
      'Nenhuma conta profissional do Instagram foi encontrada. A conta precisa ser ' +
      'Business ou Creator e estar vinculada a uma Página do Facebook.',
      { status: 400 }
    );
  }

  const ig = page.instagram_business_account;
  return {
    // O token da Página é o que autoriza as chamadas de insights do Instagram.
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    igUserId: ig.id,
    username: ig.username,
    name: ig.name || ig.username,
    profilePictureUrl: ig.profile_picture_url || null,
    followersCount: ig.followers_count ?? null
  };
}

/**
 * Roda os passos 3 a 5 e devolve tudo que a sessão precisa guardar.
 * @param {string} code
 */
export async function completeOAuth(code) {
  const shortLived = await exchangeCode(code);
  const { accessToken, expiresAt } = await exchangeForLongLived(shortLived);
  const account = await findInstagramAccount(accessToken);

  return {
    userAccessToken: accessToken,
    tokenExpiresAt: expiresAt,
    account
  };
}
