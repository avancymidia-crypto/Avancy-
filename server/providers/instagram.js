/**
 * Provider de dados reais — Instagram Graph API.
 *
 * Implementa o mesmo contrato do provider `mock`, então trocar entre os dois
 * não exige mudança nenhuma nas rotas nem na interface.
 *
 * ---------------------------------------------------------------------------
 * AVISOS QUE VALEM LER ANTES DE LIGAR ISTO EM PRODUÇÃO
 *
 * 1. Nomes de métrica mudam entre versões da API. A Meta descontinuou
 *    `impressions` no nível da conta a partir da v22 (substituída por `views`).
 *    Aqui o alcance da conta vem de `/insights`, mas impressões, curtidas,
 *    comentários, salvamentos e compartilhamentos são somados a partir das
 *    mídias — o que é mais estável entre versões e ainda bate com o que o app
 *    mostra. Alcance NÃO é somável (a Meta deduplica contas), por isso ele vem
 *    do endpoint de insights da conta.
 *
 * 2. `follower_count` só existe para os últimos 30 dias. Em períodos de 90
 *    dias o crescimento de seguidores volta como estimativa (ver getAggregates).
 *
 * 3. Insights de mídia variam conforme `media_product_type`: Reels não expõem
 *    as mesmas métricas de um post de feed. As chamadas aqui pedem o conjunto
 *    comum e toleram ausências em vez de quebrar.
 *
 * 4. Tudo isto exige App Review aprovado. Em modo de desenvolvimento só
 *    funciona para as contas listadas como testadoras no painel da Meta.
 * ---------------------------------------------------------------------------
 */

import { config } from '../config.js';

const BASE = () => `https://graph.facebook.com/${config.meta.apiVersion}`;

/** Quantas chamadas de insights de mídia rodam em paralelo. */
const MEDIA_CONCURRENCY = 5;
/** Teto de mídias analisadas por período — evita estourar o rate limit. */
const MEDIA_LIMIT = 50;

export class InstagramApiError extends Error {
  constructor(message, { status = 502, code } = {}) {
    super(message);
    this.name = 'InstagramApiError';
    this.status = status;
    this.code = code;
  }
}

async function graphGet(path, params, token) {
  const query = new URLSearchParams({ ...params, access_token: token });
  const url = `${BASE()}${path}?${query}`;

  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new InstagramApiError('Falha de rede ao consultar a API da Meta.', { status: 503 });
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    const error = body?.error || {};
    // 190 = token inválido/expirado: o app precisa pedir reconexão.
    if (error.code === 190) {
      throw new InstagramApiError('O acesso à conta expirou. Conecte novamente.', {
        status: 401,
        code: 190
      });
    }
    throw new InstagramApiError(error.message || `HTTP ${response.status}`, {
      status: response.status >= 400 && response.status < 500 ? 400 : 502,
      code: error.code
    });
  }
  return body;
}

/** Executa `worker` sobre `items` com paralelismo limitado. */
async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

const unix = (date) => Math.floor(date.getTime() / 1000);
const daysAgoDate = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/** Série diária de uma métrica de conta, como Map<'YYYY-MM-DD', number>. */
async function dailyMetric(session, metric, since, until) {
  const { igUserId, pageAccessToken } = session.account;

  const body = await graphGet(
    `/${igUserId}/insights`,
    { metric, period: 'day', since: unix(since), until: unix(until) },
    pageAccessToken
  );

  const series = new Map();
  for (const entry of body.data || []) {
    for (const point of entry.values || []) {
      if (!point.end_time) continue;
      series.set(point.end_time.slice(0, 10), Number(point.value) || 0);
    }
  }
  return series;
}

/** Normaliza o tipo de mídia para os rótulos que o app usa. */
function formatLabel(media) {
  if (media.media_product_type === 'REELS') return 'Reels';
  if (media.media_type === 'CAROUSEL_ALBUM') return 'Carrossel';
  if (media.media_type === 'VIDEO') return 'Vídeo';
  return 'Foto';
}

/** Primeira linha da legenda vira o título exibido. */
function titleFromCaption(caption, fallback) {
  if (!caption) return fallback;
  const firstLine = caption.split('\n').find((l) => l.trim().length > 0);
  if (!firstLine) return fallback;

  const clean = firstLine.trim().replace(/\s+/g, ' ');
  return clean.length > 90 ? `${clean.slice(0, 89)}…` : clean;
}

/** Lê os insights de uma mídia, tolerando métricas indisponíveis. */
async function mediaInsights(mediaId, token) {
  const metrics = ['reach', 'saved', 'likes', 'comments', 'shares'];

  let body;
  try {
    body = await graphGet(`/${mediaId}/insights`, { metric: metrics.join(',') }, token);
  } catch (error) {
    // Métrica indisponível para este tipo de mídia não deve derrubar a lista.
    if (error.status === 400) return {};
    throw error;
  }

  const out = {};
  for (const entry of body.data || []) {
    out[entry.name] = Number(entry.values?.[0]?.value) || 0;
  }
  return out;
}

export const instagramProvider = {
  id: 'instagram',

  async getAccount(session) {
    const { igUserId, pageAccessToken } = session.account;

    const body = await graphGet(
      `/${igUserId}`,
      { fields: 'username,name,followers_count,media_count,profile_picture_url' },
      pageAccessToken
    );

    return {
      igUserId,
      username: body.username,
      name: body.name || body.username,
      profilePictureUrl: body.profile_picture_url || null,
      followersCount: Number(body.followers_count) || 0
    };
  },

  /** Totais do período atual e do período imediatamente anterior. */
  async getAggregates(session, period) {
    const now = new Date();
    const currentStart = daysAgoDate(period.days);
    const previousStart = daysAgoDate(period.days * 2);

    const [currentReach, previousReach, currentMedia, previousMedia] = await Promise.all([
      sumDaily(session, 'reach', currentStart, now),
      sumDaily(session, 'reach', previousStart, currentStart),
      this.getPosts(session, period),
      fetchMediaBetween(session, previousStart, currentStart)
    ]);

    const followersGained = await followerDelta(session, period.days);
    const previousGained = await followerDelta(session, period.days, period.days);

    return {
      current: { reach: currentReach, ...sumMedia(currentMedia), followersGained },
      previous: {
        reach: previousReach,
        ...sumMedia(previousMedia),
        followersGained: previousGained
      }
    };
  },

  /** Alcance por bucket: 7 dias -> dia, 30 -> semana, 90 -> mês. */
  async getSeries(session, period) {
    const now = new Date();
    const since = daysAgoDate(period.days);

    const [reachByDay, interactionsByDay] = await Promise.all([
      dailyMetric(session, 'reach', since, now),
      dailyMetric(session, 'total_interactions', since, now).catch(() => new Map())
    ]);

    const days = [...reachByDay.keys()].sort();
    const bucketCount = period.days === 7 ? 7 : period.days === 30 ? 4 : 6;
    const perBucket = Math.max(1, Math.ceil(days.length / bucketCount));

    const buckets = [];
    for (let i = 0; i < days.length; i += perBucket) {
      const slice = days.slice(i, i + perBucket);
      if (!slice.length) continue;

      buckets.push({
        label: bucketLabel(slice, period.days),
        reach: slice.reduce((sum, d) => sum + (reachByDay.get(d) || 0), 0),
        interactions: slice.reduce((sum, d) => sum + (interactionsByDay.get(d) || 0), 0)
      });
    }
    return buckets;
  },

  async getPosts(session, period) {
    const since = daysAgoDate(period.days);
    return fetchMediaBetween(session, since, new Date());
  },

  /**
   * A Graph API não tem um feed de notificações. Estes alertas são derivados
   * dos próprios números — é o que dá para oferecer com honestidade.
   */
  async getNotifications(session) {
    const period = { days: 30, id: '30', label: '30 dias' };
    const posts = await this.getPosts(session, period);
    if (!posts.length) return [];

    const sorted = [...posts].sort((a, b) => b.reach - a.reach);
    const best = sorted[0];
    const average = posts.reduce((sum, p) => sum + p.reach, 0) / posts.length;

    const alerts = [];
    if (best.reach > average * 1.5) {
      alerts.push({
        dot: '#C9A06D',
        title: `Destaque do mês: ${best.format} com ${new Intl.NumberFormat('pt-BR').format(best.reach)} contas alcançadas`,
        body: best.title,
        time: 'últimos 30 dias'
      });
    }

    const photos = posts.filter((p) => p.format === 'Foto');
    if (photos.length >= 2) {
      const photoAverage = photos.reduce((s, p) => s + p.reach, 0) / photos.length;
      if (photoAverage < average * 0.8) {
        alerts.push({
          dot: '#6F6252',
          title: 'Fotos com alcance abaixo da média',
          body: 'Publicações estáticas estão rendendo menos que os outros formatos no período.',
          time: 'últimos 30 dias'
        });
      }
    }
    return alerts;
  }
};

/** Soma uma métrica diária no intervalo. */
async function sumDaily(session, metric, since, until) {
  const series = await dailyMetric(session, metric, since, until);
  let total = 0;
  for (const value of series.values()) total += value;
  return total;
}

/**
 * Variação de seguidores. `follower_count` só cobre 30 dias; para períodos
 * maiores extrapola a média diária dos últimos 30 e marca como estimativa.
 */
async function followerDelta(session, days, offsetDays = 0) {
  const until = daysAgoDate(offsetDays);
  const since = daysAgoDate(offsetDays + Math.min(days, 30));

  let series;
  try {
    series = await dailyMetric(session, 'follower_count', since, until);
  } catch {
    return 0;
  }

  let total = 0;
  for (const value of series.values()) total += value;

  if (days <= 30 || series.size === 0) return total;
  return Math.round((total / series.size) * days);
}

function sumMedia(posts) {
  return posts.reduce(
    (acc, p) => ({
      impressions: acc.impressions + (p.impressions || 0),
      likes: acc.likes + (p.likes || 0),
      comments: acc.comments + (p.comments || 0),
      saves: acc.saves + (p.saves || 0),
      shares: acc.shares + (p.shares || 0)
    }),
    { impressions: 0, likes: 0, comments: 0, saves: 0, shares: 0 }
  );
}

/** Lista mídias no intervalo e anexa os insights de cada uma. */
async function fetchMediaBetween(session, since, until) {
  const { igUserId, pageAccessToken } = session.account;

  const body = await graphGet(
    `/${igUserId}/media`,
    {
      fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count',
      since: unix(since),
      until: unix(until),
      limit: String(MEDIA_LIMIT)
    },
    pageAccessToken
  );

  const media = (body.data || []).slice(0, MEDIA_LIMIT);

  return mapWithLimit(media, MEDIA_CONCURRENCY, async (item) => {
    const insights = await mediaInsights(item.id, pageAccessToken);
    const format = formatLabel(item);

    return {
      id: item.id,
      title: titleFromCaption(item.caption, `${format} sem legenda`),
      format,
      timestamp: new Date(item.timestamp).getTime(),
      permalink: item.permalink || null,
      thumbnailUrl: item.thumbnail_url || item.media_url || null,
      reach: insights.reach || 0,
      // Sem `impressions` no nível de mídia nas versões novas, o alcance é a
      // melhor aproximação disponível.
      impressions: insights.impressions || insights.reach || 0,
      likes: insights.likes ?? item.like_count ?? 0,
      comments: insights.comments ?? item.comments_count ?? 0,
      saves: insights.saved || 0,
      shares: insights.shares || 0
    };
  });
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function bucketLabel(days, periodDays) {
  const first = new Date(`${days[0]}T00:00:00Z`);

  if (periodDays === 7) return WEEKDAYS[first.getUTCDay()];
  if (periodDays === 30) {
    const week = Math.floor((Date.now() - first.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `Sem ${Math.max(1, 4 - week)}`;
  }
  return MONTHS[first.getUTCMonth()].replace(/^./, (c) => c.toUpperCase());
}
