/**
 * Traduz os dados de domínio (números crus) para o formato que a interface
 * consome (strings já formatadas em pt-BR, percentuais dos anéis, etc.).
 *
 * Fica fora dos providers de propósito: `mock` e `instagram` devolvem a mesma
 * forma de domínio, e toda a apresentação acontece aqui uma vez só. É o que
 * garante que trocar a fonte de dados não mude nada na tela.
 */

import { computeScore, scoreDeltaLabel } from '../score.js';

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export const PERIODS = [
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 }
];

export function findPeriod(id) {
  return PERIODS.find((p) => p.id === String(id)) || PERIODS[1];
}

const fmtInt = (n) => integer.format(Math.round(n || 0));
const fmtPct = (fraction) => `${oneDecimal.format((fraction || 0) * 100)}%`;

/** Variação percentual entre dois valores, como "18%" (sem sinal). */
function deltaPct(current, previous) {
  if (!previous) return null;
  return Math.round((current / previous - 1) * 100);
}

/**
 * Rótulo de variação com sinal e separador decimal em pt-BR,
 * ex. "+18%", "-6%", "+0,3pp".
 */
function signed(value, suffix = '%', decimals = 0) {
  if (value === null || !Number.isFinite(value)) return null;

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);

  // O Intl já traz o "-"; só o "+" precisa ser adicionado.
  return `${value > 0 ? '+' : ''}${formatted}${suffix}`;
}

function totalInteractions(a) {
  return (a.likes || 0) + (a.comments || 0) + (a.saves || 0) + (a.shares || 0);
}

/** Monta o payload da tela Início. */
export function presentOverview({ period, current, previous, series, topPosts, account }) {
  const interactions = totalInteractions(current);

  const scored = computeScore({
    reach: current.reach,
    interactions,
    followers: account.followersCount,
    followersGained: current.followersGained,
    periodDays: period.days
  });

  let previousScore = null;
  if (previous) {
    previousScore = computeScore({
      reach: previous.reach,
      interactions: totalInteractions(previous),
      followers: Math.max(1, account.followersCount - current.followersGained),
      followersGained: previous.followersGained,
      periodDays: period.days
    }).score;
  }

  // Barras: alcance de cada bucket como % do maior bucket do período.
  const maxReach = Math.max(1, ...series.map((s) => s.reach));
  const bars = series.map((s) => ({
    label: s.label,
    pct: Math.round((s.reach / maxReach) * 100)
  }));

  // Linha: taxa de engajamento de cada bucket, numa escala 0–100 onde 100
  // equivale a 12% — alto o bastante para a linha caber sob as barras.
  const LINE_CEILING = 0.12;
  const line = series.map((s) => {
    const rate = s.reach > 0 ? s.interactions / s.reach : 0;
    return Math.max(0, Math.min(100, Math.round((rate / LINE_CEILING) * 100)));
  });

  const engagementRate = current.reach > 0 ? interactions / current.reach : 0;
  const previousEngagementRate =
    previous && previous.reach > 0 ? totalInteractions(previous) / previous.reach : null;

  const startFollowers = Math.max(1, account.followersCount - current.followersGained);
  const growthRate = current.followersGained / startFollowers;
  const previousGrowthRate = previous
    ? previous.followersGained / Math.max(1, startFollowers - previous.followersGained)
    : null;

  /** Card de métrica com variação contra o período anterior. */
  const tile = (label, key) => ({
    label,
    value: fmtInt(current[key]),
    delta: signed(deltaPct(current[key], previous?.[key]))
  });

  return {
    period: { id: period.id, label: period.label, days: period.days },
    score: {
      value: scored.score,
      delta: scoreDeltaLabel(scored.score, previousScore, period.days),
      components: scored.components
    },
    chart: { bars, line },
    metrics: [
      tile('Alcance total', 'reach'),
      tile('Impressões', 'impressions'),
      tile('Comentários', 'comments'),
      tile('Salvamentos', 'saves'),
      tile('Curtidas', 'likes'),
      tile('Compart.', 'shares')
    ],
    gauges: [
      {
        label: 'Taxa de engajamento',
        value: fmtPct(engagementRate),
        pct: Math.round(Math.min(100, (engagementRate / 0.1) * 100)),
        delta:
          previousEngagementRate === null
            ? null
            : signed((engagementRate - previousEngagementRate) * 100, 'pp', 1),
        ring: '#C9A06D'
      },
      {
        label: 'Cresc. de seguidores',
        value: signed(growthRate * 100, '%', 1),
        pct: Math.round(Math.min(100, (growthRate / 0.1) * 100)),
        delta:
          previousGrowthRate === null
            ? null
            : signed((growthRate - previousGrowthRate) * 100, 'pp', 1),
        ring: '#9CAE5A'
      }
    ],
    topPosts: topPosts.map((p, i) => presentPostRow(p, { rank: i + 1 }))
  };
}

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

/** "22 jul" — sem o ponto que o Intl adiciona em alguns ambientes. */
function shortDate(timestamp) {
  if (!timestamp) return '';
  return DATE_FORMAT.format(new Date(timestamp)).replace('.', '');
}

/** Linha de post nas listas (Início e Conteúdo). */
export function presentPostRow(post, { rank } = {}) {
  const engagementRate = post.reach > 0 ? totalInteractions(post) / post.reach : 0;
  const date = shortDate(post.timestamp);

  return {
    id: post.id,
    title: post.title,
    format: post.format,
    date,
    meta: rank ? `${rank} · ${post.format} · ${date}` : `${post.format} · ${date}`,
    reach: fmtInt(post.reach),
    reachValue: post.reach,
    saves: fmtInt(post.saves),
    engagement: fmtPct(engagementRate),
    permalink: post.permalink || null,
    thumbnailUrl: post.thumbnailUrl || null
  };
}

/**
 * Leitura automática, usada quando o post não traz um texto escrito à mão.
 * Não substitui análise humana — aponta o que os números destacam.
 */
function generateInsight(post, averages) {
  const parts = [];
  const engagementRate = post.reach > 0 ? totalInteractions(post) / post.reach : 0;
  const saveRate = post.reach > 0 ? post.saves / post.reach : 0;

  if (post.reach >= averages.reach * 1.5) {
    parts.push(`Alcance bem acima da média da conta (${fmtInt(averages.reach)} em média).`);
  } else if (post.reach <= averages.reach * 0.7) {
    parts.push(`Alcance abaixo da média da conta (${fmtInt(averages.reach)} em média).`);
  }

  if (saveRate >= averages.saveRate * 1.3) {
    parts.push('A taxa de salvamento é alta — conteúdo que as pessoas guardam para depois costuma render impulsionamento.');
  }

  if (engagementRate >= averages.engagementRate * 1.3) {
    parts.push('O engajamento superou o padrão do perfil; vale testar o formato de novo.');
  } else if (engagementRate <= averages.engagementRate * 0.7) {
    parts.push('O engajamento ficou abaixo do padrão do perfil para o alcance obtido.');
  }

  if (!parts.length) {
    parts.push('Desempenho dentro da média da conta, sem desvios relevantes no período.');
  }
  return parts.join(' ');
}

/** Payload da tela de detalhe do post. */
export function presentPostDetail(post, { averages, rank, total }) {
  const interactions = totalInteractions(post);
  const engagementRate = post.reach > 0 ? interactions / post.reach : 0;

  const reachDiff = averages.reach > 0 ? Math.round((post.reach / averages.reach) * 100 - 100) : 0;
  const savesDiff = averages.saves > 0 ? Math.round((post.saves / averages.saves) * 100 - 100) : 0;
  const engagementDiff = (engagementRate - averages.engagementRate) * 100;

  /** Barra de comparação: 55% da largura = na média. */
  const bar = (value, average) =>
    average > 0 ? Math.max(2, Math.min(100, Math.round((value / average) * 55))) : 0;

  return {
    id: post.id,
    title: post.title,
    format: post.format,
    date: shortDate(post.timestamp),
    meta: `${post.format} · ${shortDate(post.timestamp)}`,
    engagement: fmtPct(engagementRate),
    rankLabel: rank ? `${rank}º de ${total} no período` : '',
    permalink: post.permalink || null,
    thumbnailUrl: post.thumbnailUrl || null,
    metrics: [
      { label: 'Alcance', value: fmtInt(post.reach) },
      { label: 'Impressões', value: fmtInt(post.impressions) },
      { label: 'Curtidas', value: fmtInt(post.likes) },
      { label: 'Comentários', value: fmtInt(post.comments) },
      { label: 'Salvamentos', value: fmtInt(post.saves) },
      { label: 'Compart.', value: fmtInt(post.shares) }
    ],
    compare: [
      {
        label: 'Alcance',
        delta: signed(reachDiff),
        down: reachDiff < 0,
        pct: bar(post.reach, averages.reach)
      },
      {
        label: 'Salvamentos',
        delta: signed(savesDiff),
        down: savesDiff < 0,
        pct: bar(post.saves, averages.saves)
      },
      {
        label: 'Taxa de engajamento',
        delta: signed(engagementDiff, 'pp', 1),
        down: engagementDiff < 0,
        pct: bar(engagementRate, averages.engagementRate)
      }
    ],
    insight: post.insight || generateInsight(post, averages)
  };
}

/** Médias da conta, base das comparações do detalhe. */
export function computeAverages(posts) {
  if (!posts.length) return { reach: 0, saves: 0, engagementRate: 0 };

  const sum = posts.reduce(
    (acc, p) => ({
      reach: acc.reach + p.reach,
      saves: acc.saves + p.saves,
      interactions: acc.interactions + totalInteractions(p)
    }),
    { reach: 0, saves: 0, interactions: 0 }
  );

  return {
    reach: sum.reach / posts.length,
    saves: sum.saves / posts.length,
    engagementRate: sum.reach > 0 ? sum.interactions / sum.reach : 0
  };
}
