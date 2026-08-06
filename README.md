# Avancy · app mobile

Painel de métricas do Instagram para contas profissionais. PWA instalável, com
backend próprio que fala com a Instagram Graph API.

Feito a partir da peça `Avancy App.dc.html`, criada no Claude Design.

## Rodando

```bash
npm install
npm start
# http://localhost:3000
```

Sobe em modo **simulado**: a conexão com o Instagram é fingida e os números são
de exemplo, para dar para usar o app inteiro sem credencial nenhuma. Trocar
para dados reais é uma variável de ambiente — ver
[docs/meta-app-setup.md](docs/meta-app-setup.md).

Para desenvolvimento com reload automático: `npm run dev`.

## Colocando no ar

O repositório já vem configurado para Render (`render.yaml`), Fly.io
(`fly.toml` + `Dockerfile`) e Railway (`railway.json`). O caminho mais rápido e
sem custo é o Render, ligado direto ao GitHub. Passo a passo e comparação das
três em [docs/deploy.md](docs/deploy.md).

HTTPS não é detalhe: sem ele o navegador não registra o service worker nem
oferece a instalação. As três plataformas dão certificado de graça.

## Instalando no celular

Abra a URL no navegador do celular e use *Adicionar à Tela de Início* (iOS,
pelo botão de compartilhar) ou *Instalar app* (Android/Chrome). O app abre em
tela cheia, sem barra de navegador, e continua funcionando offline com os
últimos dados carregados.

No Android, quando o navegador oferece a instalação, aparece também um botão
**Instalar na tela de início** dentro de Ajustes.

## Telas

| Tela | O que mostra |
| --- | --- |
| **Conectar** | Autorização da conta via Meta (OAuth) |
| **Início** | Score Avancy, evolução do alcance, métricas do período, medidores e top posts |
| **Conteúdo** | Publicações do período, com filtro por formato e ordenação por alcance |
| **Detalhe** | Métricas da publicação, comparação com a média da conta e leitura automática |
| **Alertas** | Avisos derivados dos números |
| **Ajustes** | Perfil, preferências, origem dos dados e desconexão |

O seletor de 7 / 30 / 90 dias recalcula tudo, inclusive quais publicações
entram na lista.

## Arquitetura

```
server/
  index.js              Express: estáticos, API, CSP, tratamento de erro
  config.js             Configuração via ambiente (lê .env sem dependência)
  session.js            Sessão no servidor; o navegador só recebe um id assinado
  score.js              Fórmula do Score Avancy
  auth/meta-oauth.js    Fluxo OAuth da Meta, do code ao token de 60 dias
  providers/
    index.js            Escolhe o provider conforme DATA_PROVIDER
    mock.js             Dados simulados, internamente coerentes
    instagram.js        Instagram Graph API
    presenter.js        Formata domínio -> interface (pt-BR, anéis, rótulos)
  routes/
    auth.js             /auth/instagram, callback, logout
    api.js              /api/me, overview, posts, notifications, settings

public/                 O PWA: index.html, CSS, JS, fontes, ícones, sw.js
design/                 A peça original do Claude Design, como referência
```

### Por que existe um backend

Não é possível fazer o OAuth da Meta com segurança a partir de uma página
estática: o fluxo exige a chave secreta do app, e ela não pode chegar ao
navegador. Os tokens de acesso ficam só na sessão do servidor — o cliente
carrega apenas um identificador assinado num cookie `httpOnly`.

### Trocar simulado por real

`mock.js` e `instagram.js` implementam o mesmo contrato:

```
getAccount(session)            -> perfil e total de seguidores
getAggregates(session, period) -> totais do período atual e do anterior
getSeries(session, period)     -> buckets do gráfico
getPosts(session, period)      -> publicações da janela
getNotifications(session)      -> alertas
```

Toda a formatação vive em `presenter.js`, fora dos providers. É isso que
garante que trocar a fonte não muda nada na tela.

## Score Avancy

Não é uma métrica da Meta — é da Avancy, e está em `server/score.js`.
Combina três componentes normalizados para 0–100:

| Componente | Peso | Referência para nota 100 |
| --- | --- | --- |
| Alcance | 40% | 5% dos seguidores alcançados por dia |
| Engajamento | 40% | 10% de interações sobre o alcance |
| Crescimento | 20% | 0,15% de seguidores novos por dia |

Alcance e crescimento acumulam com o tempo, então suas referências são **por
dia** e multiplicadas pela duração do período — senão uma janela de 7 dias
seria julgada contra a régua de 30 e tiraria nota baixa por construção. O
engajamento é uma razão, e não acumula: a referência é fixa.

Essas referências são a opinião do produto sobre o que é "bom". Valem ser
calibradas com as contas que a Avancy atende.

## Configuração

Copie `.env.example` para `.env`. Nada é obrigatório em modo simulado.

| Variável | Para quê |
| --- | --- |
| `PORT` | Porta do servidor (padrão 3000) |
| `PUBLIC_URL` | URL pública; precisa bater com o redirecionamento cadastrado na Meta |
| `SESSION_SECRET` | Assina o cookie de sessão. Sem ele, as sessões caem a cada restart |
| `DATA_PROVIDER` | `mock` ou `instagram` |
| `META_APP_ID` / `META_APP_SECRET` | Credenciais da Meta (só no modo `instagram`) |
| `META_API_VERSION` | Versão da Graph API (padrão `v21.0`) |

## O que ainda não é real

Honestidade sobre o estado atual:

- **Os números são simulados** até o App Review da Meta ser aprovado. O app
  mostra um aviso em todas as telas enquanto estiver nesse modo.
- **As sessões reais vivem em memória.** As simuladas ficam no próprio cookie
  assinado e sobrevivem a restart — por isso o app continua conectado quando a
  hospedagem hiberna. As reais, que carregam os tokens da Meta, não podem ir
  para o cookie: um deploy desconecta quem estiver logado, e não funciona com
  mais de uma instância. `server/session.js` isola isso atrás de
  get/set/delete — trocar por Redis é pontual.
- **Notificações push não existem.** A linha em Ajustes é enfeite; push real
  exige Web Push com chaves VAPID e um serviço de entrega.
- **"Relatório mensal por e-mail" também é enfeite.** Não há envio implementado.
- **Sem testes automatizados.** A verificação até aqui foi manual e por
  navegação automatizada.

## Limites da API do Instagram

Alguns pontos afetam o que dá para mostrar mesmo com tudo aprovado —
impressões descontinuadas no nível da conta, `follower_count` limitado a 30
dias, métricas que variam por tipo de mídia. Estão detalhados em
[docs/meta-app-setup.md](docs/meta-app-setup.md#o-que-a-api-entrega--e-o-que-não-entrega).
