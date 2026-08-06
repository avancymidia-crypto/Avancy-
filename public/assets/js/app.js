/* ==========================================================================
   Avancy · app mobile

   A interface não conhece mais nenhum número: tudo vem da API em /api/*.
   Trocar dados simulados por dados reais do Instagram é uma variável de
   ambiente no servidor — nada aqui muda.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Ícones
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

  var FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'reels', label: 'Reels' },
    { id: 'carrossel', label: 'Carrossel' },
    { id: 'foto', label: 'Foto' }
  ];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  function h(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function map(list, fn) {
    return (list || []).map(fn).join('');
  }

  function ring(radius, pct) {
    var circumference = 2 * Math.PI * radius;
    return {
      dash: circumference.toFixed(2),
      offset: (circumference * (1 - (pct || 0) / 100)).toFixed(2)
    };
  }

  /* ------------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------------ */

  var state = {
    booting: true,
    connected: false,
    connecting: false,
    account: null,
    simulated: false,
    screen: 'connect',
    tab: 'home',
    period: '30',
    postId: null,
    filter: 'todos',
    sortDesc: true,
    notice: null,
    installReady: false
  };

  var root;
  var scrollEl;
  var deferredInstall = null;

  /* ------------------------------------------------------------------------
     Camada de dados — cache por URL, com estado de carregamento
     ------------------------------------------------------------------------ */

  var cache = new Map();

  /** Depois disso, os dados são considerados velhos e revalidados em segundo
   *  plano. Métricas mudam ao longo do dia; um app aberto por horas não pode
   *  ficar mostrando o mesmo número. */
  var TTL_MS = 5 * 60 * 1000;

  function request(url) {
    var entry = cache.get(url);

    if (entry) {
      var busy = entry.status === 'loading' || entry.refreshing;
      // Erro só sai daqui por ação do usuário (botão "tentar de novo"),
      // senão cada render dispararia uma tentativa nova.
      var terminal = entry.status === 'error';
      var fresh = Date.now() - (entry.fetchedAt || 0) < TTL_MS;

      if (busy || terminal || fresh) return entry;

      // Velho: revalida em segundo plano e devolve o que já tem, para a tela
      // não piscar um esqueleto sobre dados que continuam válidos.
      entry.refreshing = true;
      fetchInto(entry, url);
      return entry;
    }

    entry = { status: 'loading', data: null, error: null, fetchedAt: 0, refreshing: false };
    cache.set(url, entry);
    fetchInto(entry, url);
    return entry;
  }

  function fetchInto(entry, url) {
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (body) {
          if (response.status === 401) {
            // A sessão caiu (token expirado, servidor reiniciado). Volta para
            // a tela de conexão em vez de mostrar erro.
            cache.clear();
            state.connected = false;
            state.screen = 'connect';
            state.notice = 'Sua sessão expirou. Conecte a conta novamente.';
            throw new Error('unauthorized');
          }
          if (!response.ok) {
            throw new Error((body && body.message) || 'Não foi possível carregar os dados.');
          }
          entry.status = 'ready';
          entry.data = body;
          entry.error = null;
          entry.fetchedAt = Date.now();
        });
      })
      .catch(function (error) {
        if (error.message === 'unauthorized') {
          cache.delete(url);
          return;
        }
        // Numa revalidação que falha, é melhor manter o dado antigo na tela
        // do que trocá-lo por uma mensagem de erro.
        if (entry.status === 'ready') {
          entry.fetchedAt = Date.now();
          return;
        }
        entry.status = 'error';
        entry.error = error.message;
      })
      .then(function () {
        entry.refreshing = false;
        render();
      });
  }

  /** Marca tudo como velho — a próxima renderização revalida. */
  function markStale() {
    cache.forEach(function (entry) { entry.fetchedAt = 0; });
  }

  function invalidate() {
    cache.clear();
  }

  /**
   * Saída do app para uma navegação de página inteira (o fluxo de OAuth).
   * Isolado num ponto só para que o build estático de demonstração — que roda
   * sem servidor — possa interceptar em vez de sair da página.
   */
  function redirect(url) {
    if (typeof window.__avancyRedirect === 'function') {
      window.__avancyRedirect(url);
      return;
    }
    window.location.href = url;
  }

  function setState(patch) {
    var resetScroll =
      ('screen' in patch && patch.screen !== state.screen) ||
      ('tab' in patch && patch.tab !== state.tab);

    Object.keys(patch).forEach(function (key) { state[key] = patch[key]; });

    render();
    if (resetScroll && scrollEl) scrollEl.scrollTop = 0;
  }

  /* ------------------------------------------------------------------------
     Blocos reutilizáveis
     ------------------------------------------------------------------------ */

  function skeleton(className) {
    return '<div class="skeleton ' + className + '"></div>';
  }

  function errorBlock(message, retryUrl) {
    return (
      '<div class="state-block">' +
      '<span class="state-block__title">Não deu para carregar</span>' +
      '<p class="state-block__body">' + h(message) + '</p>' +
      '<button class="btn-ghost" data-action="retry" data-url="' + h(retryUrl) + '">' +
      'Tentar de novo</button>' +
      '</div>'
    );
  }

  /** Envolve um recurso: mostra esqueleto, erro ou o conteúdo pronto. */
  function withResource(url, skeletonHtml, renderReady) {
    var entry = request(url);
    if (entry.status === 'loading') return skeletonHtml;
    if (entry.status === 'error') return errorBlock(entry.error, url);
    return renderReady(entry.data);
  }

  function noticeBar() {
    if (!state.notice) return '';
    return (
      '<div class="notice" role="status">' + h(state.notice) +
      '<button class="notice__close" data-action="dismiss-notice" aria-label="Fechar">×</button>' +
      '</div>'
    );
  }

  /** Faixa discreta avisando que os números não são reais. */
  function simulatedBadge() {
    if (!state.simulated) return '';
    return '<div class="databadge">Dados simulados — a conta ainda não está ligada ao Instagram</div>';
  }

  /* ------------------------------------------------------------------------
     Tela: conectar
     ------------------------------------------------------------------------ */

  function connectScreen() {
    var busy = state.connecting;
    return (
      '<div class="connect">' +
      noticeBar() +
      '<img src="/assets/avancy-mark-beige.svg" style="height:30px;width:auto" alt="Avancy">' +
      '<h1 class="connect__title">Conecte sua conta do Instagram</h1>' +
      '<p class="connect__body">Autorize a Avancy a ler as métricas da sua conta profissional. ' +
      'É um fluxo de autorização simples, como &ldquo;Entrar com Google&rdquo; — sua senha do ' +
      'Instagram não é solicitada em nenhum momento.</p>' +
      '<button class="btn-primary" data-action="connect"' + (busy ? ' aria-busy="true" disabled' : '') + '>' +
      (busy ? '<span class="spinner" aria-hidden="true"></span>' : ICONS.instagram) +
      (busy ? 'Autorizando…' : 'Conectar com Instagram') +
      '</button>' +
      (state.simulated
        ? '<p class="connect__note">Este ambiente está em <strong>modo simulado</strong>: ' +
          'a conexão é fingida e os números são de exemplo, para você navegar pelo app antes ' +
          'da aprovação da Meta.</p>'
        : '<p class="connect__note">Sua conta precisa ser <strong>Business ou Creator</strong> ' +
          'e estar vinculada a uma Página do Facebook. <a href="#">Como converter minha conta</a></p>') +
      '<div class="connect__legal"><p>Ao conectar, você autoriza a Avancy a acessar alcance, ' +
      'comentários, salvamentos e demais métricas da sua conta, conforme nossa ' +
      '<a href="#">Política de Privacidade</a>. Você pode revogar o acesso a qualquer momento.</p></div>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------------
     Tela: início
     ------------------------------------------------------------------------ */

  var HOME_SKELETON =
    skeleton('skeleton--segmented') +
    skeleton('skeleton--score') +
    skeleton('skeleton--card') +
    '<div class="grid-2">' + skeleton('skeleton--tile') + skeleton('skeleton--tile') +
    skeleton('skeleton--tile') + skeleton('skeleton--tile') + '</div>';

  function homeScreen() {
    var account = state.account || {};

    var header =
      '<div class="topbar">' +
      '<img src="/assets/avancy-logo-white.svg" style="height:15px;width:auto" alt="Avancy">' +
      '<div class="topbar__actions">' +
      '<button class="icon-btn" data-action="tab" data-tab="notif" aria-label="Notificações">' +
      ICONS.bellSmall + '<span class="icon-btn__dot"></span></button>' +
      avatarHtml(account, 'avatar') +
      '</div></div>' +
      '<div class="account">' +
      '<span class="account__name">' + h(account.name) + '</span>' +
      '<span class="account__handle">' + h(account.handle) + ' · conta conectada</span>' +
      '</div>';

    var periods =
      '<div class="segmented" role="tablist" aria-label="Período">' +
      map(['7', '30', '90'], function (id) {
        return (
          '<button class="segmented__item" role="tab" data-action="period" data-period="' + id + '"' +
          ' aria-selected="' + (state.period === id ? 'true' : 'false') + '">' + id + ' dias</button>'
        );
      }) +
      '</div>';

    var body = withResource(
      '/api/overview?period=' + encodeURIComponent(state.period),
      HOME_SKELETON,
      renderOverview
    );

    return '<div class="screen">' + noticeBar() + simulatedBadge() + header + periods + body + '</div>';
  }

  function avatarHtml(account, className) {
    if (account.profilePictureUrl) {
      return (
        '<img class="' + className + ' ' + className + '--photo" src="' +
        h(account.profilePictureUrl) + '" alt="" referrerpolicy="no-referrer">'
      );
    }
    return '<div class="' + className + '">' + h(account.initials || '—') + '</div>';
  }

  function renderOverview(data) {
    var hero = ring(62, data.score.value);

    var chartW = 640;
    var chartH = 130;
    var line = data.chart.line || [];
    var stepX = line.length > 1 ? chartW / (line.length - 1) : chartW;
    var points = line
      .map(function (v, i) {
        return (i * stepX).toFixed(1) + ',' + (chartH - (v / 100) * chartH).toFixed(1);
      })
      .join(' ');

    return (
      '<div class="score">' +
      '<span class="eyebrow">Score Avancy · ' + h(data.period.label) + '</span>' +
      '<div class="score__dial">' +
      '<svg width="148" height="148" viewBox="0 0 148 148" aria-hidden="true">' +
      '<circle cx="74" cy="74" r="62" fill="none" stroke="rgba(250,234,213,0.08)" stroke-width="11"/>' +
      '<circle class="score__ring" cx="74" cy="74" r="62" fill="none" stroke="#FFEAD5" stroke-width="11" ' +
      'stroke-linecap="round" stroke-dasharray="' + hero.dash + '" stroke-dashoffset="' + hero.offset + '"/>' +
      '</svg>' +
      '<div class="score__readout">' +
      '<span class="score__value">' + h(data.score.value) + '</span>' +
      '<span class="score__scale">/ 100</span>' +
      '</div></div>' +
      '<span class="pill">' + h(data.score.delta) + '</span>' +
      '<p class="score__caption">Resultado consolidado do período, combinando alcance, ' +
      'engajamento e crescimento de seguidores.</p>' +
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
      '<polyline points="' + points + '" fill="none" stroke="#9CAE5A" stroke-width="3" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      map(data.chart.bars, function (b) {
        return '<div class="chart__bar" style="height:' + b.pct + '%"></div>';
      }) +
      '</div>' +
      '<div class="chart__labels">' +
      map(data.chart.bars, function (b) {
        return '<span class="chart__label">' + h(b.label) + '</span>';
      }) +
      '</div></div>' +

      '<div class="grid-2">' +
      map(data.metrics, function (m) {
        return (
          '<div class="metric">' +
          '<span class="metric__label">' + h(m.label) + '</span>' +
          '<span class="metric__value">' + h(m.value) + '</span>' +
          (m.delta
            ? '<span class="metric__delta' + (m.delta.charAt(0) === '-' ? ' metric__delta--down' : '') +
              '">' + h(m.delta) + '</span>'
            : '<span class="metric__delta metric__delta--muted">sem base</span>') +
          '</div>'
        );
      }) +
      '</div>' +

      '<div class="grid-2">' +
      map(data.gauges, function (g) {
        var r = ring(34, g.pct);
        return (
          '<div class="gauge">' +
          '<span class="gauge__label">' + h(g.label) + '</span>' +
          '<div class="gauge__dial">' +
          '<svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">' +
          '<circle cx="42" cy="42" r="34" fill="none" stroke="rgba(250,234,213,0.08)" stroke-width="8"/>' +
          '<circle class="gauge__ring" cx="42" cy="42" r="34" fill="none" stroke="' + h(g.ring) + '" ' +
          'stroke-width="8" stroke-linecap="round" stroke-dasharray="' + r.dash + '" ' +
          'stroke-dashoffset="' + r.offset + '"/></svg>' +
          '<span class="gauge__value">' + h(g.value) + '</span>' +
          '</div>' +
          (g.delta
            ? '<span class="gauge__delta' + (g.delta.charAt(0) === '-' ? ' gauge__delta--down' : '') +
              '">' + h(g.delta) + '</span>'
            : '<span class="gauge__delta gauge__delta--muted">sem base</span>') +
          '</div>'
        );
      }) +
      '</div>' +

      '<div class="section-head">' +
      '<span class="section-head__title">Top posts do período</span>' +
      '<button class="link-btn" data-action="tab" data-tab="posts">Ver todos</button>' +
      '</div>' +
      (data.topPosts.length
        ? '<div class="rows">' + map(data.topPosts, compactPostRow) + '</div>'
        : '<p class="empty">Nenhuma publicação no período.</p>')
    );
  }

  function thumbHtml(post, className) {
    if (post.thumbnailUrl) {
      return (
        '<img class="' + className + ' ' + className + '--photo" src="' + h(post.thumbnailUrl) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer">'
      );
    }
    return '<div class="' + className + '">post</div>';
  }

  function compactPostRow(post) {
    return (
      '<button class="post" data-action="open" data-id="' + h(post.id) + '">' +
      thumbHtml(post, 'post__thumb') +
      '<div class="post__body">' +
      '<span class="post__meta">' + h(post.meta) + '</span>' +
      '<div class="post__stats">' +
      '<span>Alcance <strong>' + h(post.reach) + '</strong></span>' +
      '<span>Salv. <strong>' + h(post.saves) + '</strong></span>' +
      '<span>Engaj. <strong>' + h(post.engagement) + '</strong></span>' +
      '</div></div>' +
      '<span class="post__chev" aria-hidden="true">›</span>' +
      '</button>'
    );
  }

  /* ------------------------------------------------------------------------
     Tela: conteúdo
     ------------------------------------------------------------------------ */

  function postsScreen() {
    var url =
      '/api/posts?period=' + encodeURIComponent(state.period) +
      '&format=' + encodeURIComponent(state.filter) +
      '&sort=' + (state.sortDesc ? 'desc' : 'asc');

    var chips =
      '<div class="chips">' +
      map(FILTERS, function (f) {
        return (
          '<button class="chip" data-action="filter" data-filter="' + f.id + '"' +
          ' aria-selected="' + (state.filter === f.id ? 'true' : 'false') + '">' + h(f.label) + '</button>'
        );
      }) +
      '</div>';

    var sortbar =
      '<div class="sortbar">' +
      '<span class="sortbar__label">Ordenado por alcance</span>' +
      '<button class="link-btn link-btn--sm" data-action="sort">' +
      (state.sortDesc ? 'Maior alcance ↓' : 'Menor alcance ↑') +
      '</button></div>';

    var listSkeleton =
      '<div class="rows">' + skeleton('skeleton--row') + skeleton('skeleton--row') +
      skeleton('skeleton--row') + skeleton('skeleton--row') + '</div>';

    var head = withResource(url, '<span class="account__handle">carregando…</span>', function (data) {
      return '<span class="account__handle">' + data.count + ' publicações · ' + h(data.period.label) + '</span>';
    });

    var list = withResource(url, listSkeleton, function (data) {
      if (!data.posts.length) {
        return '<p class="empty">Nenhuma publicação neste formato no período selecionado.</p>';
      }
      return (
        '<div class="rows">' +
        map(data.posts, function (post) {
          return (
            '<button class="post post--lg" data-action="open" data-id="' + h(post.id) + '">' +
            thumbHtml(post, 'post__thumb') +
            '<div class="post__body">' +
            '<span class="post__title">' + h(post.title) + '</span>' +
            '<span class="post__meta post__meta--sm">' + h(post.meta) + '</span>' +
            '<div class="post__stats">' +
            '<span>Alcance <strong>' + h(post.reach) + '</strong></span>' +
            '<span>Engaj. <strong>' + h(post.engagement) + '</strong></span>' +
            '</div></div>' +
            '<span class="post__chev" aria-hidden="true">›</span>' +
            '</button>'
          );
        }) +
        '</div>'
      );
    });

    return (
      '<div class="screen screen--gap-sm">' + noticeBar() + simulatedBadge() +
      '<div class="account"><span class="page-title">Conteúdo</span>' + head + '</div>' +
      chips + sortbar + list + '</div>'
    );
  }

  /* ------------------------------------------------------------------------
     Tela: detalhe
     ------------------------------------------------------------------------ */

  function detailScreen() {
    var url =
      '/api/posts/' + encodeURIComponent(state.postId) +
      '?period=' + encodeURIComponent(state.period);

    var body = withResource(
      url,
      '<div class="detail__body">' + skeleton('skeleton--title') +
      '<div class="grid-3">' + skeleton('skeleton--stat') + skeleton('skeleton--stat') +
      skeleton('skeleton--stat') + '</div>' + skeleton('skeleton--card') + '</div>',
      function (post) {
        return (
          (post.thumbnailUrl
            ? '<div class="detail__hero detail__hero--photo" style="background-image:url(' +
              h(post.thumbnailUrl) + ')"><span class="detail__format">' + h(post.format) + '</span></div>'
            : '<div class="detail__hero">post thumbnail<span class="detail__format">' +
              h(post.format) + '</span></div>') +
          '<div class="detail__body">' +
          '<div class="detail__headline">' +
          '<h2 class="detail__title">' + h(post.title) + '</h2>' +
          '<div class="detail__tags">' +
          '<span class="pill">Engajamento ' + h(post.engagement) + '</span>' +
          '<span class="detail__rank">' + h(post.rankLabel) + '</span>' +
          '</div></div>' +

          '<div class="grid-3">' +
          map(post.metrics, function (m) {
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
          map(post.compare, function (c) {
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
          '<p class="insight__body">' + h(post.insight) + '</p>' +
          '</div>' +
          (post.permalink
            ? '<a class="btn-ghost btn-ghost--link" href="' + h(post.permalink) +
              '" target="_blank" rel="noopener noreferrer">Abrir no Instagram</a>'
            : '') +
          '</div>'
        );
      }
    );

    var metaLine = withResource(url, '', function (post) {
      return '<span class="detail__meta">' + h(post.meta) + '</span>';
    });

    return (
      '<div class="detail">' +
      '<div class="detail__nav">' +
      '<button class="back-btn" data-action="back" aria-label="Voltar">‹</button>' +
      metaLine +
      '</div>' + body + '</div>'
    );
  }

  /* ------------------------------------------------------------------------
     Tela: alertas
     ------------------------------------------------------------------------ */

  function notifScreen() {
    var body = withResource(
      '/api/notifications',
      '<div class="rows">' + skeleton('skeleton--row') + skeleton('skeleton--row') + '</div>',
      function (data) {
        if (!data.notifications.length) {
          return '<p class="empty">Nenhum alerta por enquanto.</p>';
        }
        return (
          '<div class="rows">' +
          map(data.notifications, function (n) {
            return (
              '<div class="notif">' +
              '<span class="notif__dot" style="background:' + h(n.dot) + '"></span>' +
              '<div class="notif__body">' +
              '<span class="notif__title">' + h(n.title) + '</span>' +
              '<span class="notif__text">' + h(n.body) + '</span>' +
              '<span class="notif__time">' + h(n.time) + '</span>' +
              '</div></div>'
            );
          }) +
          '</div>'
        );
      }
    );

    return (
      '<div class="screen screen--gap-sm">' + noticeBar() + simulatedBadge() +
      '<span class="page-title">Notificações</span>' + body + '</div>'
    );
  }

  /* ------------------------------------------------------------------------
     Tela: ajustes
     ------------------------------------------------------------------------ */

  function settingsScreen() {
    var body = withResource(
      '/api/settings',
      skeleton('skeleton--profile') + skeleton('skeleton--card'),
      function (data) {
        return (
          '<div class="profile">' +
          avatarHtml(data.account, 'avatar avatar--lg') +
          '<div class="profile__body">' +
          '<span class="profile__name">' + h(data.account.name) + '</span>' +
          '<span class="profile__handle">' + h(data.account.handle) + ' · conta profissional</span>' +
          '</div>' +
          '<span class="profile__badge">Ativa</span>' +
          '</div>' +
          '<div class="list">' +
          map(data.rows, function (r) {
            return (
              '<div class="list__row">' +
              '<span class="list__label">' + h(r.label) + '</span>' +
              '<span class="list__value">' + h(r.value) + '</span>' +
              '</div>'
            );
          }) +
          '</div>' +
          (state.installReady
            ? '<button class="btn-primary btn-primary--compact" data-action="install">' +
              'Instalar na tela de início</button>'
            : '') +
          '<button class="btn-ghost" data-action="disconnect">Desconectar conta</button>'
        );
      }
    );

    return (
      '<div class="screen screen--gap-sm">' + noticeBar() +
      '<span class="page-title">Ajustes</span>' + body + '</div>'
    );
  }

  /* ------------------------------------------------------------------------
     Barra de abas
     ------------------------------------------------------------------------ */

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
    if (!root) return;

    var body;
    if (state.booting) {
      body = '<div class="boot"><span class="spinner spinner--light" aria-label="Carregando"></span></div>';
    } else if (!state.connected) {
      body = connectScreen();
    } else if (state.screen === 'detail') {
      body = detailScreen();
    } else if (state.tab === 'posts') {
      body = postsScreen();
    } else if (state.tab === 'notif') {
      body = notifScreen();
    } else if (state.tab === 'settings') {
      body = settingsScreen();
    } else {
      body = homeScreen();
    }

    root.innerHTML =
      '<div class="app__scroll">' + body + '</div>' +
      (state.connected && !state.booting ? tabBar() : '');

    scrollEl = root.querySelector('.app__scroll');
  }

  /* ------------------------------------------------------------------------
     Eventos
     ------------------------------------------------------------------------ */

  function onClick(event) {
    var el = event.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;

    switch (el.dataset.action) {
      case 'connect':
        setState({ connecting: true });
        redirect('/auth/instagram');
        break;

      case 'disconnect':
        fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
          .catch(function () { /* desconecta localmente de qualquer forma */ })
          .then(function () {
            invalidate();
            setState({
              connected: false,
              account: null,
              screen: 'connect',
              tab: 'home',
              postId: null,
              notice: null
            });
          });
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

      case 'retry':
        cache.delete(el.dataset.url);
        render();
        break;

      case 'dismiss-notice':
        setState({ notice: null });
        break;

      case 'install':
        if (deferredInstall) {
          deferredInstall.prompt();
          deferredInstall = null;
          setState({ installReady: false });
        }
        break;
    }
  }

  /* ------------------------------------------------------------------------
     PWA
     ------------------------------------------------------------------------ */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (error) {
        console.warn('Service worker não registrou:', error.message);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstall = event;
    setState({ installReady: true });
  });

  /** Voltar para o app depois de um tempo fora deve trazer números atuais. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state.connected) {
      markStale();
      render();
    }
  });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  function readQueryFlags() {
    var params = new URLSearchParams(window.location.search);
    var notice = null;

    if (params.get('error')) notice = params.get('error');
    if (params.has('connected') || params.has('error')) {
      // Limpa a query para o estado não voltar num refresh.
      window.history.replaceState({}, '', window.location.pathname);
    }
    return notice;
  }

  function start() {
    root = document.getElementById('app');
    if (!root) return;

    root.addEventListener('click', onClick);
    var notice = readQueryFlags();
    render();

    fetch('/api/me', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (me) {
        setState({
          booting: false,
          connected: Boolean(me.connected),
          account: me.account || null,
          simulated: Boolean(me.simulated),
          screen: me.connected ? 'app' : 'connect',
          notice: notice
        });
      })
      .catch(function () {
        setState({
          booting: false,
          connected: false,
          screen: 'connect',
          notice: notice || 'Não foi possível falar com o servidor.'
        });
      });

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
