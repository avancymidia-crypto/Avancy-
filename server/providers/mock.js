/**
 * Provider de dados simulados.
 *
 * Implementa o mesmo contrato do provider `instagram`, com números
 * internamente coerentes: o alcance, as interações e o crescimento se
 * sustentam entre si, então o Score Avancy calculado em cima deles é um número
 * de verdade — não um valor cravado na mão como era no protótipo.
 *
 * Serve para desenvolver e demonstrar o app enquanto o App Review da Meta não
 * sai. Trocar para dados reais é mudar DATA_PROVIDER=instagram no ambiente.
 */

const ACCOUNT = {
  igUserId: 'mock-ig-user',
  username: 'avancymidia',
  name: 'Avancy Mídia',
  profilePictureUrl: null,
  followersCount: 128400
};

/** Agregados por período, mais o período imediatamente anterior (comparação). */
const AGGREGATES = {
  7: {
    current: { reach: 38100, impressions: 51200, likes: 1980, comments: 312, saves: 820, shares: 196, followersGained: 640 },
    previous: { reach: 35400, impressions: 47900, likes: 1810, comments: 281, saves: 720, shares: 174, followersGained: 580 }
  },
  30: {
    current: { reach: 158400, impressions: 214600, likes: 7240, comments: 1284, saves: 3560, shares: 892, followersGained: 3180 },
    previous: { reach: 134200, impressions: 191700, likes: 6390, comments: 1178, saves: 2870, shares: 841, followersGained: 2510 }
  },
  90: {
    current: { reach: 448000, impressions: 601000, likes: 21400, comments: 3910, saves: 9870, shares: 2430, followersGained: 9850 },
    previous: { reach: 367000, impressions: 504000, likes: 18300, comments: 3430, saves: 7710, shares: 2190, followersGained: 7640 }
  }
};

/** Buckets do gráfico por período: dias, semanas ou meses. */
const SERIES = {
  7: [
    { label: 'Seg', reach: 4210, interactions: 352 },
    { label: 'Ter', reach: 4940, interactions: 431 },
    { label: 'Qua', reach: 4680, interactions: 388 },
    { label: 'Qui', reach: 5980, interactions: 542 },
    { label: 'Sex', reach: 7120, interactions: 668 },
    { label: 'Sáb', reach: 5570, interactions: 471 },
    { label: 'Dom', reach: 5600, interactions: 456 }
  ],
  30: [
    { label: 'Sem 1', reach: 32800, interactions: 2510 },
    { label: 'Sem 2', reach: 39600, interactions: 3280 },
    { label: 'Sem 3', reach: 37400, interactions: 3010 },
    { label: 'Sem 4', reach: 48600, interactions: 4176 }
  ],
  90: [
    { label: 'Mar', reach: 58200, interactions: 4410 },
    { label: 'Abr', reach: 65800, interactions: 5210 },
    { label: 'Mai', reach: 71400, interactions: 5880 },
    { label: 'Jun', reach: 78900, interactions: 6640 },
    { label: 'Jul', reach: 84300, interactions: 7290 },
    { label: 'Ago', reach: 89400, interactions: 8180 }
  ]
};

/** Dias atrás -> timestamp, para as datas não envelhecerem na demonstração. */
const daysAgo = (n) => Date.now() - n * 24 * 60 * 60 * 1000;

/**
 * Onze publicações distribuídas ao longo de 90 dias, na cadência de quem posta
 * duas vezes por semana. A distribuição importa: com ela, trocar o período
 * muda de verdade o que aparece na tela — 2 publicações em 7 dias, 6 em 30,
 * 11 em 90 — e as comparações com a média da conta passam a ter base.
 */
const POSTS = [
  {
    id: 'p1', title: '5 erros que derrubam o alcance do seu perfil', format: 'Reels',
    timestamp: daysAgo(3), reach: 42180, impressions: 56420, likes: 2610, comments: 284, saves: 980, shares: 412,
    insight: 'Reels de lista curta seguram a audiência até o fim. O pico de salvamentos veio nas primeiras 6 horas — vale repetir o formato quinzenalmente.'
  },
  {
    id: 'p2', title: 'Como a gente monta um calendário de conteúdo', format: 'Carrossel',
    timestamp: daysAgo(6), reach: 31560, impressions: 39870, likes: 1840, comments: 196, saves: 740, shares: 308,
    insight: 'O carrossel teve alta conclusão até o 6º card. Os comentários pedindo orçamento indicam espaço para um post sobre pacotes.'
  },
  {
    id: 'p3', title: 'Case: +180% de alcance em 90 dias', format: 'Foto',
    timestamp: daysAgo(11), reach: 24870, impressions: 28940, likes: 1320, comments: 148, saves: 512, shares: 221,
    insight: 'Cases performam bem em alcance, mas com salvamento baixo. Reforçar com Stories e um carrossel destrinchando o processo.'
  },
  {
    id: 'p4', title: 'O que medir de verdade no Instagram do seu negócio', format: 'Carrossel',
    timestamp: daysAgo(16), reach: 19430, impressions: 23110, likes: 1060, comments: 132, saves: 604, shares: 186,
    insight: 'Conteúdo educativo gera salvamento acima da média mesmo com alcance menor. Bom candidato a impulsionamento.'
  },
  {
    id: 'p5', title: 'Lucax explica: quando vale investir em tráfego pago', format: 'Reels',
    timestamp: daysAgo(22), reach: 17210, impressions: 21640, likes: 890, comments: 96, saves: 388, shares: 142,
    insight: 'Vídeos com rosto na abertura têm retenção 22% maior que os com narração. Manter esse padrão nos próximos.'
  },
  {
    id: 'p6', title: 'Bastidores: um dia de gravação com cliente', format: 'Reels',
    timestamp: daysAgo(27), reach: 12980, impressions: 15320, likes: 640, comments: 64, saves: 214, shares: 88,
    insight: 'Bastidores geram simpatia, não conversão. Usar como respiro entre conteúdos educativos, sem esperar salvamentos.'
  },
  {
    id: 'p7', title: 'Vagas abertas: social media pleno', format: 'Foto',
    timestamp: daysAgo(35), reach: 9640, impressions: 11280, likes: 452, comments: 58, saves: 176, shares: 74,
    insight: 'Post institucional com alcance baixo, mas comentários com dúvidas reais. Vale fixar no perfil e responder em massa.'
  },
  {
    id: 'p8', title: 'Três formatos que funcionam para prestador de serviço', format: 'Carrossel',
    timestamp: daysAgo(44), reach: 22310, impressions: 26800, likes: 1180, comments: 141, saves: 690, shares: 204,
    insight: 'Carrossel com exemplo concreto por card puxou salvamento acima da média. Formato replicável para outros nichos.'
  },
  {
    id: 'p9', title: 'Por que seu Reels para de crescer no terceiro dia', format: 'Reels',
    timestamp: daysAgo(53), reach: 28940, impressions: 35100, likes: 1720, comments: 212, saves: 612, shares: 289,
    insight: 'O alcance despencou após 72 horas, como é padrão em Reels. Publicar o próximo antes desse corte mantém a curva.'
  },
  {
    id: 'p10', title: 'Antes e depois: a bio que triplicou os cliques', format: 'Foto',
    timestamp: daysAgo(68), reach: 15420, impressions: 18200, likes: 812, comments: 88, saves: 341, shares: 118,
    insight: 'Comparação visual gera compartilhamento, mas pouco comentário. Combinar com uma pergunta na legenda pode destravar conversa.'
  },
  {
    id: 'p11', title: 'O que aprendemos gerenciando 40 contas por 3 anos', format: 'Carrossel',
    timestamp: daysAgo(81), reach: 34760, impressions: 42300, likes: 2040, comments: 268, saves: 1120, shares: 376,
    insight: 'Conteúdo de autoridade com número concreto no título. Maior taxa de salvamento do trimestre — vale transformar em série.'
  }
];

const NOTIFICATIONS = [
  { dot: '#C9A06D', title: 'Seu Reels passou de 40 mil contas alcançadas', body: '5 erros que derrubam o alcance do seu perfil — 42.180 contas.', time: 'há 2 horas' },
  { dot: '#9CAE5A', title: 'O Score Avancy subiu no último mês', body: 'Crescimento puxado pelo alcance e pelos salvamentos.', time: 'ontem' },
  { dot: '#6F6252', title: 'Relatório mensal disponível', body: 'Resumo do mês pronto para exportar em PDF.', time: '3 dias' },
  { dot: '#6F6252', title: 'Queda no alcance de fotos', body: 'Publicações estáticas caíram 12% nas últimas duas semanas.', time: '5 dias' }
];

export const mockProvider = {
  id: 'mock',

  async getAccount() {
    return { ...ACCOUNT };
  },

  async getAggregates(_session, period) {
    return AGGREGATES[period.days] || AGGREGATES[30];
  },

  async getSeries(_session, period) {
    return SERIES[period.days] || SERIES[30];
  },

  /** Posts publicados dentro da janela do período. */
  async getPosts(_session, period) {
    const cutoff = daysAgo(period.days);
    const within = POSTS.filter((p) => p.timestamp >= cutoff);
    // Períodos curtos podem não conter publicação nenhuma; nesse caso devolve
    // as mais recentes para a tela não ficar vazia numa demonstração.
    return (within.length ? within : POSTS.slice(0, 3)).map((p) => ({ ...p }));
  },

  async getNotifications() {
    return NOTIFICATIONS.map((n) => ({ ...n }));
  }
};
