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

function serialize(id) {
  return `${id}.${sign(id)}`;
}

/** Devolve o id se a assinatura conferir, senão null. */
function parse(raw) {
  if (typeof raw !== 'string') return null;

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;

  const id = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(id);

  // Comparação em tempo constante — evita vazar a assinatura por timing.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  return id;
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
  const id = parse(readCookie(req, COOKIE_NAME));
  req.sessionId = id;
  req.session = id ? store.get(id) : null;

  req.startSession = (data) => {
    const newId = crypto.randomBytes(24).toString('base64url');
    store.set(newId, data);
    req.sessionId = newId;
    req.session = data;

    res.cookie(COOKIE_NAME, serialize(newId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: config.sessionTtlMs,
      path: '/'
    });
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
