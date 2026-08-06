/**
 * API que a interface consome.
 *
 * Todas as rotas abaixo de /api exigem sessão, exceto /api/me — que é
 * justamente como o app descobre se já está conectado.
 */

import express from 'express';
import { requireSession } from '../session.js';
import { provider, usingMockData } from '../providers/index.js';
import {
  PERIODS,
  findPeriod,
  presentOverview,
  presentPostRow,
  presentPostDetail,
  computeAverages
} from '../providers/presenter.js';

export const apiRouter = express.Router();

/** Iniciais para o avatar: "Avancy Mídia" -> "AM". */
function initialsOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function accountPayload(account) {
  return {
    name: account.name,
    handle: account.username ? `@${account.username}` : '',
    initials: initialsOf(account.name),
    profilePictureUrl: account.profilePictureUrl || null,
    followersCount: account.followersCount ?? null
  };
}

/** Estado da conexão. Nunca exige sessão. */
apiRouter.get('/me', (req, res) => {
  if (!req.session) {
    return res.json({ connected: false, simulated: usingMockData, periods: PERIODS });
  }

  res.json({
    connected: true,
    simulated: Boolean(req.session.simulated),
    account: accountPayload(req.session.account),
    periods: PERIODS
  });
});

/** Tela Início. */
apiRouter.get('/overview', requireSession, async (req, res, next) => {
  try {
    const period = findPeriod(req.query.period);

    const [account, aggregates, series, posts] = await Promise.all([
      provider.getAccount(req.session),
      provider.getAggregates(req.session, period),
      provider.getSeries(req.session, period),
      provider.getPosts(req.session, period)
    ]);

    const topPosts = [...posts].sort((a, b) => b.reach - a.reach).slice(0, 3);

    res.json(
      presentOverview({
        period,
        current: aggregates.current,
        previous: aggregates.previous,
        series,
        topPosts,
        account
      })
    );
  } catch (error) {
    next(error);
  }
});

/** Tela Conteúdo. */
apiRouter.get('/posts', requireSession, async (req, res, next) => {
  try {
    const period = findPeriod(req.query.period);
    const posts = await provider.getPosts(req.session, period);

    const format = String(req.query.format || 'todos').toLowerCase();
    const formatMap = { reels: 'Reels', carrossel: 'Carrossel', foto: 'Foto', video: 'Vídeo' };
    const wanted = formatMap[format] || null;

    const filtered = wanted ? posts.filter((p) => p.format === wanted) : posts;
    const descending = req.query.sort !== 'asc';
    const sorted = [...filtered].sort((a, b) =>
      descending ? b.reach - a.reach : a.reach - b.reach
    );

    res.json({
      period: { id: period.id, label: period.label },
      count: sorted.length,
      posts: sorted.map((p) => presentPostRow(p))
    });
  } catch (error) {
    next(error);
  }
});

/** Detalhe de uma publicação. */
apiRouter.get('/posts/:id', requireSession, async (req, res, next) => {
  try {
    const period = findPeriod(req.query.period);
    const posts = await provider.getPosts(req.session, period);

    const post = posts.find((p) => String(p.id) === String(req.params.id));
    if (!post) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Publicação não encontrada neste período.'
      });
    }

    const ranked = [...posts].sort((a, b) => b.reach - a.reach);
    const rank = ranked.findIndex((p) => p.id === post.id) + 1;

    res.json(
      presentPostDetail(post, { averages: computeAverages(posts), rank, total: posts.length })
    );
  } catch (error) {
    next(error);
  }
});

/** Tela Alertas. */
apiRouter.get('/notifications', requireSession, async (req, res, next) => {
  try {
    res.json({ notifications: await provider.getNotifications(req.session) });
  } catch (error) {
    next(error);
  }
});

/** Tela Ajustes. */
apiRouter.get('/settings', requireSession, async (req, res, next) => {
  try {
    const account = await provider.getAccount(req.session);
    const followers = account.followersCount
      ? new Intl.NumberFormat('pt-BR').format(account.followersCount)
      : '—';

    res.json({
      account: accountPayload(account),
      simulated: Boolean(req.session.simulated),
      rows: [
        { label: 'Seguidores', value: followers },
        { label: 'Notificações push', value: 'Ativadas' },
        { label: 'Relatório mensal por e-mail', value: 'Dia 1' },
        {
          label: 'Origem dos dados',
          value: req.session.simulated ? 'Simulados' : 'Instagram'
        },
        { label: 'Política de privacidade', value: '›' }
      ]
    });
  } catch (error) {
    next(error);
  }
});
