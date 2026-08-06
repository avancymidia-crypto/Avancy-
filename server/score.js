/**
 * Score Avancy — 0 a 100.
 *
 * Não existe na API da Meta: é uma métrica da própria Avancy. O texto do app
 * define o que ela deve significar — "resultado consolidado do período,
 * combinando alcance, engajamento e crescimento de seguidores" — e é
 * exatamente isso que está implementado aqui.
 *
 * Cada componente é normalizado para 0–100 contra uma referência (o valor que
 * vale nota 100) e depois combinado pelos pesos. As referências são o que você
 * vai querer calibrar com o tempo, olhando as contas que a Avancy atende:
 * elas são a opinião do produto sobre o que é "bom".
 */

/** Peso de cada componente. Soma 1. */
export const WEIGHTS = {
  reach: 0.4,
  engagement: 0.4,
  growth: 0.2
};

/**
 * Valor que corresponde à nota 100 em cada componente.
 *
 * Alcance e crescimento acumulam com o tempo, então suas referências são
 * POR DIA e multiplicadas pela duração do período — senão uma janela de 7 dias
 * seria julgada contra a régua de 30 e tiraria nota baixa por construção.
 * O engajamento é uma razão (interações / alcance), que não acumula: a
 * referência dele é fixa.
 */
export const BENCHMARKS = {
  /** Alcance diário como fração dos seguidores. Em 30 dias -> 1.5x a base. */
  reachRatioPerDay: 0.05,
  /** Interações divididas pelo alcance. 0.10 = 10%. */
  engagementRate: 0.1,
  /** Crescimento diário de seguidores. Em 30 dias -> 4.5%. */
  growthRatePerDay: 0.0015
};

/** Normaliza para 0–100, saturando no teto. */
function normalize(value, benchmark) {
  if (!Number.isFinite(value) || !Number.isFinite(benchmark) || benchmark <= 0) return 0;
  return Math.max(0, Math.min(100, (value / benchmark) * 100));
}

/**
 * @param {object} input
 * @param {number} input.reach            contas alcançadas no período
 * @param {number} input.interactions     curtidas + comentários + salvamentos + compartilhamentos
 * @param {number} input.followers        seguidores ao fim do período
 * @param {number} input.followersGained  variação de seguidores no período
 * @param {number} input.periodDays       duração da janela, em dias
 * @returns {{score: number, components: object}}
 */
export function computeScore({
  reach = 0,
  interactions = 0,
  followers = 0,
  followersGained = 0,
  periodDays = 30
}) {
  const base = followers > 0 ? followers : 1;
  const days = periodDays > 0 ? periodDays : 30;

  const reachRatio = reach / base;
  const engagementRate = reach > 0 ? interactions / reach : 0;
  // Base do crescimento é o total no início do período.
  const startFollowers = Math.max(1, followers - followersGained);
  const growthRate = followersGained / startFollowers;

  const components = {
    reach: normalize(reachRatio, BENCHMARKS.reachRatioPerDay * days),
    engagement: normalize(engagementRate, BENCHMARKS.engagementRate),
    growth: normalize(growthRate, BENCHMARKS.growthRatePerDay * days)
  };

  const score =
    components.reach * WEIGHTS.reach +
    components.engagement * WEIGHTS.engagement +
    components.growth * WEIGHTS.growth;

  return {
    score: Math.round(score),
    components: {
      reach: Math.round(components.reach),
      engagement: Math.round(components.engagement),
      growth: Math.round(components.growth)
    },
    rates: { reachRatio, engagementRate, growthRate }
  };
}

/** Rótulo de variação usado no card do score, ex.: "+5 pts vs. mês anterior". */
export function scoreDeltaLabel(current, previous, periodDays) {
  const reference =
    periodDays <= 7 ? 'semana anterior' : periodDays <= 30 ? 'mês anterior' : 'trimestre anterior';

  if (!Number.isFinite(previous)) return `Sem base de comparação`;

  const diff = Math.round(current - previous);
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff} pts vs. ${reference}`;
}
