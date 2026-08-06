/**
 * Configuração lida do ambiente.
 *
 * Nada de segredo fica no código. Em desenvolvimento os valores vêm de um
 * arquivo .env (ver .env.example); em produção, das variáveis do próprio host.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Carrega .env sem depender de biblioteca externa. */
function loadDotEnv() {
  const file = path.join(rootDir, '.env');
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const env = process.env;

/**
 * `mock`      — dados de exemplo, sem falar com a Meta. Padrão.
 * `instagram` — dados reais via Instagram Graph API. Exige as credenciais
 *               da Meta e as permissões aprovadas no App Review.
 */
const dataProvider = env.DATA_PROVIDER === 'instagram' ? 'instagram' : 'mock';

const port = Number(env.PORT) || 3000;

/**
 * URL pública do app. As plataformas de hospedagem expõem a delas por
 * variável de ambiente, então na maioria dos casos não é preciso configurar
 * PUBLIC_URL na mão — o que evita o erro mais comum do OAuth, que é o
 * redirect_uri não bater com o cadastrado na Meta.
 */
function detectPublicUrl() {
  if (env.PUBLIC_URL) return env.PUBLIC_URL;
  if (env.RENDER_EXTERNAL_URL) return env.RENDER_EXTERNAL_URL;
  if (env.RAILWAY_PUBLIC_DOMAIN) return `https://${env.RAILWAY_PUBLIC_DOMAIN}`;
  if (env.FLY_APP_NAME) return `https://${env.FLY_APP_NAME}.fly.dev`;
  return `http://localhost:${port}`;
}

const publicUrl = detectPublicUrl().replace(/\/$/, '');

export const config = {
  rootDir,
  port,
  publicUrl,
  isProduction: env.NODE_ENV === 'production',
  dataProvider,

  /** Assina o cookie de sessão. Gerado a cada boot se não for informado —
   *  aceitável em desenvolvimento, mas derruba as sessões a cada restart. */
  sessionSecret: env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  sessionTtlMs: 1000 * 60 * 60 * 24 * 30,

  meta: {
    appId: env.META_APP_ID || '',
    appSecret: env.META_APP_SECRET || '',
    apiVersion: env.META_API_VERSION || 'v21.0',
    redirectUri: `${publicUrl}/auth/instagram/callback`,
    /** Permissões necessárias para ler métricas de uma conta profissional.
     *  Todas exigem App Review da Meta antes de funcionar fora do modo de
     *  desenvolvimento. Ver docs/meta-app-setup.md. */
    scopes: [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement'
    ]
  }
};

/** Erros de configuração que impedem o modo `instagram` de funcionar. */
export function validateConfig() {
  const problems = [];

  if (config.dataProvider === 'instagram') {
    if (!config.meta.appId) problems.push('META_APP_ID não definido');
    if (!config.meta.appSecret) problems.push('META_APP_SECRET não definido');
    if (config.publicUrl.startsWith('http://localhost')) {
      problems.push(
        'PUBLIC_URL aponta para localhost — a Meta não aceita. Use a URL ' +
        'pública com https, e cadastre-a como redirect_uri no painel do app'
      );
    }
  }

  if (config.isProduction && !env.SESSION_SECRET) {
    problems.push('SESSION_SECRET não definido — as sessões caem a cada restart');
  }

  return problems;
}
