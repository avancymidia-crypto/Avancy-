/**
 * Sessões do lado do servidor.
 *
 * Os tokens da Meta NUNCA vão para o navegador — ficam aqui, e o cliente
 * carrega apenas um id de sessão assinado no cookie.
 *
 * O armazenamento é em memória, o que basta para desenvolvimento e para uma
 * instância única. Em produção com mais de um processo, troque `MemoryStore`
 * por Redis ou por uma tabela no banco: a interface é só get/set/delete.
 */

import crypto from 'node:crypto';
import { config } from './config.js';

const COOKIE_NAME = 'avancy_sid';

class MemoryStore {
  #entries = new Map();

  get(id) {
    const entry = this.#entries.get(id);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(id);
      return null;
    }
    return entry.data;
  }

  set(id, data) {
    this.#entries.set(id, { data, expiresAt: Date.now() + config.sessionTtlMs });
  }

  delete(id) {
    this.#entries.delete(id);
  }

  /** Remove sessões vencidas. Chamado por um timer no index.js. */
  prune() {
    const now = Date.now();
    for (const [id, entry] of this.#entries) {
      if (entry.expiresAt <= now) this.#entries.delete(id);
    }
  }
}

export const store = new MemoryStore();

function sign(value) {
  return crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}

/**
 * O cookie tem dois formatos, ambos assinados:
 *
 *   i:<id>.<assinatura>       sessão real — os dados (incluindo os tokens da
 *                             Meta) ficam no servidor, o cookie só aponta
 *   s:<payload>.<assinatura>  sessão simulada — não há segredo nenhum para
 *                             proteger, então cabe inteira no cookie
 *
 * O segundo formato existe porque a sessão simulada precisa sobreviver a um
 * restart do servidor: em hospedagem que hiberna por inatividade, uma sessão
 * só em memória desconectaria o usuário a cada vez que o app acordasse.
 */
function serialize(kind, body) {
  const value = `${kind}:${body}`;
  return `${value}.${sign(value)}`;
}

/** Devolve `{ kind, body }` se a assinatura conferir, senão null. */
function parse(raw) {
  if (typeof raw !== 'string') return null;

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;

  const value = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(value);

  // Comparação em tempo constante — evita vazar a assinatura por timing.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const colon = value.indexOf(':');
  if (colon === -1) return null;

  return { kind: value.slice(0, colon), body: value.slice(colon + 1) };
}

function encodeStateless(data) {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
}

function decodeStateless(body) {
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/**
 * Middleware: expõe `req.session` (dados ou null) e os utilitários
 * `req.startSession(data)` / `req.destroySession()`.
 */
export function sessionMiddleware(req, res, next) {
  const cookie = parse(readCookie(req, COOKIE_NAME));

  req.sessionId = null;
  req.session = null;

  if (cookie?.kind === 's') {
    req.session = decodeStateless(cookie.body);
  } else if (cookie?.kind === 'i') {
    req.sessionId = cookie.body;
    req.session = store.get(cookie.body);
  }

  // Com frontend em outro domínio o navegador só envia o cookie se ele for
  // SameSite=None, e isso obriga Secure. Sem CORS configurado, fica em Lax,
  // que é mais restritivo e protege contra CSRF.
  const cookieOptions = {
    httpOnly: true,
    sameSite: config.crossOrigin ? 'none' : 'lax',
    secure: config.crossOrigin || config.isProduction,
    maxAge: config.sessionTtlMs,
    path: '/'
  };

  req.startSession = (data) => {
    req.session = data;

    if (data.simulated) {
      // Sem token para proteger: a sessão inteira vai no cookie assinado.
      req.sessionId = null;
      res.cookie(COOKIE_NAME, serialize('s', encodeStateless(data)), cookieOptions);
      return data;
    }

    const newId = crypto.randomBytes(24).toString('base64url');
    store.set(newId, data);
    req.sessionId = newId;
    res.cookie(COOKIE_NAME, serialize('i', newId), cookieOptions);
    return data;
  };

  req.saveSession = () => {
    if (req.sessionId && req.session) store.set(req.sessionId, req.session);
  };

  req.destroySession = () => {
    if (req.sessionId) store.delete(req.sessionId);
    req.sessionId = null;
    req.session = null;
    res.clearCookie(COOKIE_NAME, { path: '/' });
  };

  next();
}

/** Bloqueia rotas que exigem conta conectada. */
export function requireSession(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'not_connected', message: 'Conta não conectada.' });
  }
  next();
}
