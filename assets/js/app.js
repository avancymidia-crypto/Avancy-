/* ==========================================================================
   Avancy · app mobile
   Instagram analytics prototype.

   Ported from the Claude Design source at design/Avancy App.dc.html — the
   state shape, sample data and derived values mirror that component's
   `DCLogic` class exactly.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Account (the design exposed these as editable props)
     ------------------------------------------------------------------------ */

  var ACCOUNT = {
    name: 'Avancy Mídia',
    handle: '@avancymidia',
    initials: 'AM'
  };

  /* ------------------------------------------------------------------------
     Sample data, keyed by period
     ------------------------------------------------------------------------ */

  var DATA = {
    '7': {
      label: '7 dias',
      score: 79,
      scoreDelta: '+2 pts vs. semana anterior',
      metrics: [
        { label: 'Alcance total', value: '41.260', delta: '7%' },
        { label: 'Impressões', value: '54.880', delta: '5%' },
        { label: 'Comentários', value: '312', delta: '11%' },
        { label: 'Salvamentos', value: '820', delta: '9%' },
        { label: 'Curtidas', value: '5.140', delta: '6%' },
        { label: 'Compart.', value: '196', delta: '4%' }
      ],
      gauges: [
        { label: 'Taxa de engajamento', value: '5,9%', pct: 59, delta: '+0,3pp', ring: '#C9A06D' },
        { label: 'Cresc. de seguidores', value: '+0,8%', pct: 16, delta: '+0,2pp', ring: '#9CAE5A' }
      ],
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      bars: [52, 61, 58, 74, 88, 69, 80],
      line: [38, 44, 41, 55, 66, 58, 64]
    },
    '30': {
      label: '30 dias',
      score: 82,
      scoreDelta: '+5 pts vs. mês anterior',
      metrics: [
        { label: 'Alcance total', value: '184.320', delta: '18%' },
        { label: 'Impressões', value: '241.900', delta: '12%' },
        { label: 'Comentários', value: '1.284', delta: '9%' },
        { label: 'Salvamentos', value: '3.560', delta: '24%' },
        { label: 'Curtidas', value: '22.140', delta: '15%' },
        { label: 'Compart.', value: '892', delta: '6%' }
      ],
      gauges: [
        { label: 'Taxa de engajamento', value: '6,4%', pct: 64, delta: '+0,8pp', ring: '#C9A06D' },
        { label: 'Cresc. de seguidores', value: '+3,2%', pct: 32, delta: '+1,1pp', ring: '#9CAE5A' }
      ],
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      bars: [58, 70, 66, 92],
      line: [42, 52, 58, 70]
    },
    '90': {
      label: '90 dias',
      score: 85,
      scoreDelta: '+9 pts vs. trimestre anterior',
      metrics: [
        { label: 'Alcance total', value: '512.640', delta: '22%' },
        { label: 'Impressões', value: '688.400', delta: '19%' },
        { label: 'Comentários', value: '3.910', delta: '14%' },
        { label: 'Salvamentos', value: '9.870', delta: '28%' },
        { label: 'Curtidas', value: '61.480', delta: '17%' },
        { label: 'Compart.', value: '2.430', delta: '11%' }
      ],
      gauges: [
        { label: 'Taxa de engajamento', value: '6,9%', pct: 69, delta: '+1,2pp', ring: '#C9A06D' },
        { label: 'Cresc. de seguidores', value: '+8,4%', pct: 42, delta: '+2,6pp', ring: '#9CAE5A' }
      ],
      labels: ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
      bars: [48, 56, 63, 70, 82, 96],
      line: [34, 42, 48, 56, 66, 78]
    }
  };

  var POSTS = [
    {
      id: 'p1', title: '5 erros que derrubam o alcance do seu perfil', format: 'Reels', date: '22 jul',
      alcance: '42.180', alcanceN: 42180, salvamentos: '980', engajamento: '8,9%', impressoes: '56.420',
      curtidas: '3.910', comentarios: '284', compart: '412', tempo: '18s', rankLabel: '1º do período',
      insight: 'Reels de lista curta seguram a audiência até o fim. O pico de salvamentos veio nas primeiras 6 horas — vale repetir o formato quinzenalmente.'
    },
    {
      id: 'p2', title: 'Como a gente monta um calendário de conteúdo', format: 'Carrossel', date: '15 jul',
      alcance: '31.560', alcanceN: 31560, salvamentos: '740', engajamento: '7,4%', impressoes: '39.870',
      curtidas: '2.480', comentarios: '196', compart: '308', tempo: '—', rankLabel: '2º do período',
      insight: 'O carrossel teve alta conclusão até o 6º card. Os comentários pedindo orçamento indicam espaço para um post sobre pacotes.'
    },
    {
      id: 'p3', title: 'Case: +180% de alcance em 90 dias', format: 'Foto', date: '03 jul',
      alcance: '24.870', alcanceN: 24870, salvamentos: '512', engajamento: '6,1%', impressoes: '28.940',
      curtidas: '1.960', comentarios: '148', compart: '221', tempo: '—', rankLabel: '3º do período',
      insight: 'Cases performam bem em alcance, mas com salvamento baixo. Reforçar com Stories e um carrossel destrinchando o processo.'
    },
    {
      id: 'p4', title: 'O que medir de verdade no Instagram do seu negócio', format: 'Carrossel', date: '28 jun',
      alcance: '19.430', alcanceN: 19430, salvamentos: '604', engajamento: '5,8%', impressoes: '23.110',
      curtidas: '1.420', comentarios: '132', compart: '186', tempo: '—', rankLabel: '4º do período',
      insight: 'Conteúdo educativo gera salvamento acima da média mesmo com alcance menor. Bom candidato a impulsionamento.'
    },
    {
      id: 'p5', title: 'Lucax explica: quando vale investir em tráfego pago', format: 'Reels', date: '19 jun',
      alcance: '17.210', alcanceN: 17210, salvamentos: '388', engajamento: '5,2%', impressoes: '21.640',
      curtidas: '1.180', comentarios: '96', compart: '142', tempo: '14s', rankLabel: '5º do período',
      insight: 'Vídeos com rosto na abertura têm retenção 22% maior que os com narração. Manter esse padrão nos próximos.'
    },
    {
      id: 'p6', title: 'Bastidores: um dia de gravação com cliente', format: 'Reels', date: '11 jun',
      alcance: '12.980', alcanceN: 12980, salvamentos: '214', engajamento: '4,4%', impressoes: '15.320',
      curtidas: '910', comentarios: '64', compart: '88', tempo: '11s', rankLabel: '6º do período',
      insight: 'Bastidores geram simpatia, não conversão. Usar como respiro entre conteúdos educativos, sem esperar salvamentos.'
    },
    {
      id: 'p7', title: 'Vagas abertas: social media pleno', format: 'Foto', date: '02 jun',
      alcance: '9.640', alcanceN: 9640, salvamentos: '176', engajamento: '3,8%', impressoes: '11.280',
      curtidas: '640', comentarios: '58', compart: '74', tempo: '—', rankLabel: '7º do período',
      insight: 'Post institucional com alcance baixo, mas comentários com dúvidas reais. Vale fixar no perfil e responder em massa.'
    }
  ];

  var NOTIFICATIONS = [
    { dot: '#C9A06D', title: 'Seu Reels de 22 jul passou de 40 mil contas alcançadas', body: '5 erros que derrubam o alcance do seu perfil — 42.180 contas.', time: 'há 2 horas' },
    { dot: '#9CAE5A', title: 'Score Avancy subiu para 82', body: 'Alta de 5 pontos em relação ao mês anterior.', time: 'ontem' },
    { dot: '#6F6252', title: 'Relatório de julho disponível', body: 'Resumo do mês pronto para exportar em PDF.', time: '3 dias' },
    { dot: '#6F6252', title: 'Queda no alcance de fotos', body: 'Publicações estáticas caíram 12% nas últimas duas semanas.', time: '5 dias' }
  ];

  var FILTERS = [
    { id: 'todos', label: 'Todos', format: null },
    { id: 'reels', label: 'Reels', format: 'Reels' },
    { id: 'carrossel', label: 'Carrossel', format: 'Carrossel' },
    { id: 'foto', label: 'Foto', format: 'Foto' }
  ];

  var ACCOUNT_AVG_REACH = 18400;

  /* ------------------------------------------------------------------------
     Icons
     ------------------------------------------------------------------------ */

  var ICONS = {
    instagram:
      '<svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<rect x="1" y="1" width="18" height="18" rx="6" stroke="#1A130C" stroke-width="1.6"/>' +
      '<circle cx="10" cy="10" r="4.2" stroke="#1A130C" stroke-width="1.6"/>' +
      '<circle cx="15" cy="5.2" r="1" fill="#1A130C"/></svg>',
    bellSmall:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M8 1.5C5.8 1.5 4 3.3 4 5.5V8L2.5 11H13.5L12 8V5.5C12 3.3 10.2 1.5 8 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M6.5 13.2C6.8 13.9 7.4 14.3 8 14.3C8.6 14.3 9.2 13.9 9.5 13.2" stroke="currentColor" stroke-width="1.3"/></svg>',
    home:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M3.2 8.2 10 3l6.8 5.2V16a1 1 0 0 1-1 1h-3.4v-4.6H7.6V17H4.2a1 1 0 0 1-1-1V8.2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    grid:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<rect x="3" y="3" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="11" y="3" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="3" y="11" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="11" y="11" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.4"/></svg>',
    bell:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M10 2.6c-2.7 0-4.9 2.2-4.9 4.9v3L3.3 14h13.4l-1.8-3.5v-3c0-2.7-2.2-4.9-4.9-4.9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M8 16.2c.4.8 1.1 1.2 2 1.2s1.6-.4 2-1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    gear:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<circle cx="10" cy="10" r="2.6" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };

  var TABS = [
    { id: 'home', label: 'Início', icon: ICONS.home },
    { id: 'posts', label: 'Conteúdo', icon: ICONS.grid },
    { id: 'notif', label: 'Alertas', icon: ICONS.bell },
    { id: 'settings', label: 'Ajustes', icon: ICONS.gear }
  ];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  function h(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function map(list, fn) {
    return list.map(fn).join('');
  }

  /** Circumference and dash offset for a progress ring. */
  function ring(radius, pct) {
    var circumference = 2 * Math.PI * radius;
    return {
      dash: circumference.toFixed(2),
      offset: (circumference * (1 - pct / 100)).toFixed(2)
    };
  }

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */

  var state = {
    screen: 'connect',
    tab: 'home',
    period: '30',
    connecting: false,
    postId: null,
    filter: 'todos',
    sortDesc: true
  };

  var connectTimer = null;
  var root;
  var scrollEl;

  function setState(patch) {
    var resetScroll =
      ('screen' in patch && patch.screen !== state.screen) ||
      ('tab' in patch && patch.tab !== state.tab);

    Object.keys(patch).forEach(function (key) {
      state[key] = patch[key];
    });

    render();
    if (resetScroll && scrollEl) scrollEl.scrollTop = 0;
  }

  /* ------------------------------------------------------------------------
     Derived values — mirrors renderVals() in the design source
     ------------------------------------------------------------------------ */

  function derive() {
    var d = DATA[state.period];

    var gauges = d.gauges.map(function (g) {
      var r = ring(34, g.pct);
      return { label: g.label, value: g.value, delta: g.delta, ringColor: g.ring, dash: r.dash, offset: r.offset };
    });

    var chartW = 640;
    var chartH = 130;
    var stepX = chartW / (d.line.length - 1);
    var linePoints = d.line
      .map(function (v, i) {
        return (i * stepX).toFixed(1) + ',' + (chartH - (v / 100) * chartH).toFixed(1);
      })
      .join(' ');

    var chartBars = d.bars.map(function (pct, i) {
      return { pct: pct, label: d.labels[i] };
    });

    var activeFilter = FILTERS.filter(function (f) {
      return f.id === state.filter;
    })[0] || FILTERS[0];

    var library = POSTS.filter(function (p) {
      return !activeFilter.format || p.format === activeFilter.format;
    }).slice().sort(function (a, b) {
      return state.sortDesc ? b.alcanceN - a.alcanceN : a.alcanceN - b.alcanceN;
    });

    var detail = POSTS.filter(function (p) {
      return p.id === state.postId;
    })[0] || POSTS[0];

    var reachRatio = Math.min(100, Math.round((detail.alcanceN / ACCOUNT_AVG_REACH) * 55));
    var reachDiff = Math.round((detail.alcanceN / ACCOUNT_AVG_REACH) * 100 - 100);

    return {
      d: d,
      hero: ring(62, d.score),
      gauges: gauges,
      linePoints: linePoints,
      chartBars: chartBars,
      topPosts: POSTS.slice(0, 3),
      library: library,
      detail: detail,
      detailMetrics: [
        { label: 'Alcance', value: detail.alcance },
        { label: 'Impressões', value: detail.impressoes },
        { label: 'Curtidas', value: detail.curtidas },
        { label: 'Comentários', value: detail.comentarios },
        { label: 'Salvamentos', value: detail.salvamentos },
        { label: 'Compart.', value: detail.compart }
      ],
      detailCompare: [
        {
          label: 'Alcance',
          // Posts below the account average produce a negative figure — sign it
          // once, here, rather than hardcoding a "+" prefix.
          delta: (reachDiff > 0 ? '+' : '') + reachDiff + '%',
          down: reachDiff < 0,
          pct: reachRatio
        },
        { label: 'Salvamentos', delta: '+62%', pct: 78 },
        { label: 'Taxa de engajamento', delta: '+1,9pp', pct: 66 }
      ]
    };
  }

  /* ------------------------------------------------------------------------
     Screens
     ------------------------------------------------------------------------ */

  function connectScreen() {
    var busy = state.connecting;
    return (
      '<div class="connect">' +
      '<img src="assets/avancy-mark-beige.svg" style="height:30px;width:auto" alt="Avancy">' +
      '<h1 class="connect__title">Conecte sua conta do Instagram</h1>' +
      '<p class="connect__body">Autorize a Avancy a ler as métricas da sua conta profissional. ' +
      'É um fluxo de autorização simples, como &ldquo;Entrar com Google&rdquo; — sua senha do Instagram ' +
      'não é solicitada em nenhum momento.</p>' +
      '<button class="btn-primary" data-action="connect"' + (busy ? ' aria-busy="true"' : '') + '>' +
      (busy ? '<span class="spinner" aria-hidden="true"></span>' : ICONS.instagram) +
      (busy ? 'Autorizando…' : 'Conectar com Instagram') +
      '</button>' +
      '<p class="connect__note">Sua conta precisa ser <strong>Business ou Creator</strong> e estar ' +
      'vinculada a uma Página do Facebook. <a href="#">Como converter minha conta</a></p>' +
      '<div class="connect__legal"><p>Ao conectar, você autoriza a Avancy a acessar alcance, ' +
      'comentários, salvamentos e demais métricas da sua conta, conforme nossa ' +
      '<a href="#">Política de Privacidade</a>. Você pode revogar o acesso a qualquer momento.</p></div>' +
      '</div>'
    );
  }

  function homeScreen(v) {
    var d = v.d;
    return (
      '<div class="screen">' +
      '<div class="topbar">' +
      '<img src="assets/avancy-logo-white.svg" style="height:15px;width:auto" alt="Avancy">' +
      '<div class="topbar__actions">' +
      '<button class="icon-btn" data-action="tab" data-tab="notif" aria-label="Notificações">' +
      ICONS.bellSmall + '<span class="icon-btn__dot"></span></button>' +
      '<div class="avatar">' + h(ACCOUNT.initials) + '</div>' +
      '</div></div>' +

      '<div class="account">' +
      '<span class="account__name">' + h(ACCOUNT.name) + '</span>' +
      '<span class="account__handle">' + h(ACCOUNT.handle) + ' · conta conectada</span>' +
      '</div>' +

      '<div class="segmented" role="tablist" aria-label="Período">' +
      map(['7', '30', '90'], function (id) {
        return (
          '<button class="segmented__item" role="tab" data-action="period" data-period="' + id + '"' +
          ' aria-selected="' + (state.period === id ? 'true' : 'false') + '">' + id + ' dias</button>'
        );
      }) +
      '</div>' +

      '<div class="score">' +
      '<span class="eyebrow">Score Avancy · ' + h(d.label) + '</span>' +
      '<div class="score__dial">' +
      '<svg width="148" height="148" viewBox="0 0 148 148" aria-hidden="true">' +
      '<circle cx="74" cy="74" r="62" fill="none" stroke="rgba(250,234,213,0.08)" stroke-width="11"/>' +
      '<circle class="score__ring" cx="74" cy="74" r="62" fill="none" stroke="#FFEAD5" stroke-width="11" ' +
      'stroke-linecap="round" stroke-dasharray="' + v.hero.dash + '" stroke-dashoffset="' + v.hero.offset + '"/>' +
      '</svg>' +
      '<div class="score__readout">' +
      '<span class="score__value">' + d.score + '</span>' +
      '<span class="score__scale">/ 100</span>' +
      '</div></div>' +
      '<span class="pill">↑ ' + h(d.scoreDelta) + '</span>' +
      '<p class="score__caption">Resultado consolidado do período, combinando alcance, engajamento e ' +
      'crescimento de seguidores.</p>' +
      '</div>' +

      '<div class="card">' +
      '<div class="topbar">' +
      '<span class="card__title">Evolução do alcance</span>' +
      '<div class="legend">' +
      '<span class="legend__item"><span class="legend__swatch legend__swatch--bar"></span>Alcance</span>' +
      '<span class="legend__item"><span class="legend__swatch legend__swatch--line"></span>Engaj.</span>' +
      '</div></div>' +
      '<div class="chart">' +
      '<svg class="chart__line" width="100%" height="130" viewBox="0 0 640 130" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + v.linePoints + '" fill="none" stroke="#9CAE5A" stroke-width="3" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      map(v.chartBars, function (b) {
        return '<div class="chart__bar" style="height:' + b.pct + '%"></div>';
      }) +
      '</div>' +
      '<div class="chart__labels">' +
      map(v.chartBars, function (b) {
        return '<span class="chart__label">' + h(b.label) + '</span>';
      }) +
      '</div></div>' +

      '<div class="grid-2">' +
      map(d.metrics, function (m) {
        return (
          '<div class="metric">' +
          '<span class="metric__label">' + h(m.label) + '</span>' +
          '<span class="metric__value">' + h(m.value) + '</span>' +
          '<span class="metric__delta">↑ ' + h(m.delta) + '</span>' +
          '</div>'
        );
      }) +
      '</div>' +

      '<div class="grid-2">' +
      map(v.gauges, function (g) {
        return (
          '<div class="gauge">' +
          '<span class="gauge__label">' + h(g.label) + '</span>' +
          '<div class="gauge__dial">' +
          '<svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">' +
          '<circle cx="42" cy="42" r="34" fill="none" stroke="rgba(250,234,213,0.08)" stroke-width="8"/>' +
          '<circle class="gauge__ring" cx="42" cy="42" r="34" fill="none" stroke="' + g.ringColor + '" ' +
          'stroke-width="8" stroke-linecap="round" stroke-dasharray="' + g.dash + '" ' +
          'stroke-dashoffset="' + g.offset + '"/></svg>' +
          '<span class="gauge__value">' + h(g.value) + '</span>' +
          '</div>' +
          '<span class="gauge__delta">↑ ' + h(g.delta) + '</span>' +
          '</div>'
        );
      }) +
      '</div>' +

      '<div class="section-head">' +
      '<span class="section-head__title">Top posts do período</span>' +
      '<button class="link-btn" data-action="tab" data-tab="posts">Ver todos</button>' +
      '</div>' +
      '<div class="rows">' +
      map(v.topPosts, function (p, i) {
        return (
          '<button class="post" data-action="open" data-id="' + p.id + '">' +
          '<div class="post__thumb">post</div>' +
          '<div class="post__body">' +
          '<span class="post__meta">' + (i + 1) + ' · ' + h(p.format) + ' · ' + h(p.date) + '</span>' +
          '<div class="post__stats">' +
          '<span>Alcance <strong>' + h(p.alcance) + '</strong></span>' +
          '<span>Salv. <strong>' + h(p.salvamentos) + '</strong></span>' +
          '<span>Engaj. <strong>' + h(p.engajamento) + '</strong></span>' +
          '</div></div>' +
          '<span class="post__chev" aria-hidden="true">›</span>' +
          '</button>'
        );
      }) +
      '</div></div>'
    );
  }

  function postsScreen(v) {
    return (
      '<div class="screen screen--gap-sm">' +
      '<div class="account">' +
      '<span class="page-title">Conteúdo</span>' +
      '<span class="account__handle">' + v.library.length + ' publicações · ' + h(v.d.label) + '</span>' +
      '</div>' +

      '<div class="chips">' +
      map(FILTERS, function (f) {
        return (
          '<button class="chip" data-action="filter" data-filter="' + f.id + '"' +
          ' aria-selected="' + (state.filter === f.id ? 'true' : 'false') + '">' + h(f.label) + '</button>'
        );
      }) +
      '</div>' +

      '<div class="sortbar">' +
      '<span class="sortbar__label">Ordenado por alcance</span>' +
      '<button class="link-btn link-btn--sm" data-action="sort">' +
      (state.sortDesc ? 'Maior alcance ↓' : 'Menor alcance ↑') +
      '</button></div>' +

      (v.library.length
        ? '<div class="rows">' +
          map(v.library, function (p) {
            return (
              '<button class="post post--lg" data-action="open" data-id="' + p.id + '">' +
              '<div class="post__thumb">post</div>' +
              '<div class="post__body">' +
              '<span class="post__title">' + h(p.title) + '</span>' +
              '<span class="post__meta post__meta--sm">' + h(p.format) + ' · ' + h(p.date) + '</span>' +
              '<div class="post__stats">' +
              '<span>Alcance <strong>' + h(p.alcance) + '</strong></span>' +
              '<span>Engaj. <strong>' + h(p.engajamento) + '</strong></span>' +
              '</div></div>' +
              '<span class="post__chev" aria-hidden="true">›</span>' +
              '</button>'
            );
          }) +
          '</div>'
        : '<p class="empty">Nenhuma publicação neste formato no período selecionado.</p>') +
      '</div>'
    );
  }

  function detailScreen(v) {
    var p = v.detail;
    return (
      '<div class="detail">' +
      '<div class="detail__nav">' +
      '<button class="back-btn" data-action="back" aria-label="Voltar">‹</button>' +
      '<span class="detail__meta">' + h(p.format) + ' · ' + h(p.date) + '</span>' +
      '</div>' +

      '<div class="detail__hero">post thumbnail' +
      '<span class="detail__format">' + h(p.format) + '</span></div>' +

      '<div class="detail__body">' +
      '<div class="detail__headline">' +
      '<h2 class="detail__title">' + h(p.title) + '</h2>' +
      '<div class="detail__tags">' +
      '<span class="pill">Engajamento ' + h(p.engajamento) + '</span>' +
      '<span class="detail__rank">' + h(p.rankLabel) + '</span>' +
      '</div></div>' +

      '<div class="grid-3">' +
      map(v.detailMetrics, function (m) {
        return (
          '<div class="stat">' +
          '<span class="stat__label">' + h(m.label) + '</span>' +
          '<span class="stat__value">' + h(m.value) + '</span>' +
          '</div>'
        );
      }) +
      '</div>' +

      '<div class="card">' +
      '<span class="card__title">Comparado à média da conta</span>' +
      map(v.detailCompare, function (c) {
        return (
          '<div class="compare">' +
          '<div class="compare__head">' +
          '<span class="compare__label">' + h(c.label) + '</span>' +
          '<span class="compare__delta' + (c.down ? ' compare__delta--down' : '') + '">' +
          h(c.delta) + '</span>' +
          '</div>' +
          '<div class="compare__track"><div class="compare__fill" style="width:' + c.pct + '%"></div></div>' +
          '</div>'
        );
      }) +
      '</div>' +

      '<div class="insight">' +
      '<span class="insight__eyebrow">Leitura da Avancy</span>' +
      '<p class="insight__body">' + h(p.insight) + '</p>' +
      '</div></div></div>'
    );
  }

  function notifScreen() {
    return (
      '<div class="screen screen--gap-sm">' +
      '<span class="page-title">Notificações</span>' +
      '<div class="rows">' +
      map(NOTIFICATIONS, function (n) {
        return (
          '<div class="notif">' +
          '<span class="notif__dot" style="background:' + n.dot + '"></span>' +
          '<div class="notif__body">' +
          '<span class="notif__title">' + h(n.title) + '</span>' +
          '<span class="notif__text">' + h(n.body) + '</span>' +
          '<span class="notif__time">' + h(n.time) + '</span>' +
          '</div></div>'
        );
      }) +
      '</div></div>'
    );
  }

  function settingsScreen(v) {
    var rows = [
      { label: 'Período padrão', value: v.d.label },
      { label: 'Notificações push', value: 'Ativadas' },
      { label: 'Relatório mensal por e-mail', value: 'Dia 1' },
      { label: 'Equipe', value: '3 membros' },
      { label: 'Política de privacidade', value: '›' }
    ];
    return (
      '<div class="screen screen--gap-sm">' +
      '<span class="page-title">Ajustes</span>' +
      '<div class="profile">' +
      '<div class="avatar avatar--lg">' + h(ACCOUNT.initials) + '</div>' +
      '<div class="profile__body">' +
      '<span class="profile__name">' + h(ACCOUNT.name) + '</span>' +
      '<span class="profile__handle">' + h(ACCOUNT.handle) + ' · conta profissional</span>' +
      '</div>' +
      '<span class="profile__badge">Ativa</span>' +
      '</div>' +
      '<div class="list">' +
      map(rows, function (r) {
        return (
          '<div class="list__row">' +
          '<span class="list__label">' + h(r.label) + '</span>' +
          '<span class="list__value">' + h(r.value) + '</span>' +
          '</div>'
        );
      }) +
      '</div>' +
      '<button class="btn-ghost" data-action="disconnect">Desconectar conta</button>' +
      '</div>'
    );
  }

  function tabBar() {
    return (
      '<nav class="tabbar" role="tablist" aria-label="Navegação principal">' +
      map(TABS, function (t) {
        var active = state.tab === t.id && state.screen !== 'detail';
        return (
          '<button class="tabbar__item" role="tab" data-action="tab" data-tab="' + t.id + '"' +
          ' aria-selected="' + (active ? 'true' : 'false') + '">' + t.icon + h(t.label) + '</button>'
        );
      }) +
      '</nav>'
    );
  }

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */

  function render() {
    var v = derive();
    var body;

    if (state.screen === 'connect') body = connectScreen();
    else if (state.screen === 'detail') body = detailScreen(v);
    else if (state.tab === 'posts') body = postsScreen(v);
    else if (state.tab === 'notif') body = notifScreen();
    else if (state.tab === 'settings') body = settingsScreen(v);
    else body = homeScreen(v);

    root.innerHTML =
      '<div class="app__scroll">' + body + '</div>' +
      (state.screen !== 'connect' ? tabBar() : '');

    scrollEl = root.querySelector('.app__scroll');
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  function onClick(event) {
    var el = event.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;

    switch (el.dataset.action) {
      case 'connect':
        if (state.connecting) return;
        setState({ connecting: true });
        connectTimer = setTimeout(function () {
          setState({ connecting: false, screen: 'app', tab: 'home' });
        }, 1100);
        break;

      case 'disconnect':
        clearTimeout(connectTimer);
        setState({ screen: 'connect', tab: 'home', postId: null });
        break;

      case 'tab':
        setState({ screen: 'app', tab: el.dataset.tab });
        break;

      case 'period':
        setState({ period: el.dataset.period });
        break;

      case 'filter':
        setState({ filter: el.dataset.filter });
        break;

      case 'sort':
        setState({ sortDesc: !state.sortDesc });
        break;

      case 'open':
        setState({ postId: el.dataset.id, screen: 'detail' });
        break;

      case 'back':
        setState({ screen: 'app' });
        break;
    }
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  function start() {
    root = document.getElementById('app');
    if (!root) return;
    root.addEventListener('click', onClick);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
