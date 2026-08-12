# Briefing para o Lovable

Especificação do app Avancy para gerar a interface no Lovable, consumindo a API
que já existe neste repositório. É o texto a ser passado ao Lovable, e serve
também como especificação de referência do produto.

**Arquitetura:** o Lovable cuida só da interface. O backend continua sendo o
servidor Express deste repositório, hospedado à parte (Render/Fly/Railway).
A API já está preparada para receber chamadas de outro domínio — falta apenas
definir `ALLOWED_ORIGINS` com a URL do projeto Lovable.

---

## O produto

Painel de métricas do Instagram para contas profissionais, feito pela Avancy
Mídia. O dono da conta acompanha alcance, engajamento e crescimento, vê quais
publicações renderam e recebe uma leitura do que os números indicam.

Idioma: **português do Brasil**. Todos os textos, datas e números em pt-BR
(milhar com ponto, decimal com vírgula).

Formato: **aplicativo mobile**. A interface é desenhada para 402×874. Em telas
largas, aparece centralizada dentro de uma moldura de aparelho; abaixo de 480px
de largura ocupa a tela inteira.

## Identidade visual

Tema escuro e quente — não é cinza-azulado. A base é um marrom quase preto.

| Papel | Cor |
| --- | --- |
| Fundo da página | `#0B0805` |
| Fundo da tela do app | `#120D08` |
| Superfície de card | `#1A130C` |
| Borda | `rgba(250,234,213,0.08)` |
| Borda em hover | `rgba(250,234,213,0.22)` |
| Texto principal | `#F7F1E8` |
| Texto secundário | `#B0A08C` |
| Texto terciário | `#8A7B69` |
| Texto apagado | `#6F6252` |
| Dourado (destaque) | `#C9A06D` |
| Dourado claro | `#FFEAD5` |
| Dourado escuro | `#8A6A45` |
| Verde (alta) | `#9CAE5A` |
| Fundo do verde | `rgba(156,174,90,0.14)` |
| Avatar | `#96755B` |

Tipografia: **Nunito** no corpo (400/600/700) e **Raleway** nos títulos,
números grandes e rótulos de destaque (500/600/700).

Cantos: 16px em cards, 14px em itens de lista, 999px em pílulas.
Cards têm fundo `#1A130C` com borda de 1px.

## Telas

### 1. Conectar
Centralizada verticalmente. Símbolo da Avancy, título "Conecte sua conta do
Instagram", parágrafo explicando que é uma autorização e que a senha do
Instagram nunca é pedida. Botão claro (`#F7F1E8`, texto `#1A130C`) com ícone do
Instagram, escrito "Conectar com Instagram" — em carregamento vira "Autorizando…"
com spinner. Abaixo, o aviso de que a conta precisa ser Business ou Creator e
estar vinculada a uma Página do Facebook, e o texto legal.

Sem barra de abas nesta tela.

### 2. Início
- Cabeçalho: logotipo à esquerda; à direita o sino com ponto dourado e o avatar
- Nome da conta (Raleway 19px) e `@handle · conta conectada`
- Seletor de período: 7 / 30 / 90 dias. O ativo tem fundo `#F7F1E8`, texto escuro
- **Card do Score**: anel de progresso de 148px, traço de 11px, `#FFEAD5` sobre
  trilha `rgba(250,234,213,0.08)`, começando no topo. Número grande no centro
  (Raleway 700, 38px) com "/ 100" abaixo. Pílula verde com a variação. Legenda
  explicando o que o score combina
- **Card do gráfico**: barras de alcance em gradiente dourado
  (`#C9A06D` → `#8A6A45`), com uma linha verde de engajamento por trás.
  Legenda no topo, rótulos dos períodos embaixo
- **Grade 2×3 de métricas**: rótulo em maiúsculas, valor grande em Raleway,
  pílula de variação (verde para alta, neutra para baixa)
- **Dois medidores**: anéis de 84px, taxa de engajamento em dourado e
  crescimento de seguidores em verde
- **Top posts**: três linhas clicáveis com miniatura, posição, formato, data e
  três números (alcance, salvamentos, engajamento)

### 3. Conteúdo
Título "Conteúdo" e contagem de publicações do período. Chips de filtro
(Todos / Reels / Carrossel / Foto) — o ativo tem fundo dourado translúcido e
borda dourada. Botão de ordenação alternando "Maior alcance ↓" / "Menor alcance ↑".
Lista de publicações com miniatura de 62px, título em uma linha com reticências,
formato e data, alcance e engajamento.

### 4. Detalhe da publicação
Botão voltar e a meta da publicação. Imagem grande (230px) com pílula do formato
no canto. Título, pílula de engajamento e a posição no período. Grade 3×2 de
métricas. Card "Comparado à média da conta" com três barras de progresso —
variação em verde quando acima da média, em tom neutro quando abaixo. Card
"Leitura da Avancy", com fundo dourado translúcido e borda dourada, trazendo o
texto interpretativo.

### 5. Alertas
Lista de avisos: ponto colorido, título, corpo e o tempo decorrido.

### 6. Ajustes
Card de perfil com avatar, nome, handle e etiqueta "Ativa". Lista de linhas
rótulo/valor. Botão fantasma "Desconectar conta".

### Barra de abas
Fixa embaixo, fundo `rgba(18,13,8,0.94)` com desfoque. Quatro itens com ícone e
rótulo: **Início**, **Conteúdo**, **Alertas**, **Ajustes**. Ativo em `#F7F1E8`,
inativo em `#6F6252`. Não aparece na tela de conectar.

## A API

Base: a URL do backend hospedado. **Todas as chamadas precisam enviar cookie** —
em `fetch`, `credentials: 'include'`.

| Rota | Devolve |
| --- | --- |
| `GET /api/me` | `{ connected, simulated, account?, periods }` |
| `GET /api/overview?period=7\|30\|90` | score, gráfico, métricas, medidores, top posts |
| `GET /api/posts?period=&format=&sort=` | `{ count, period, posts[] }` |
| `GET /api/posts/:id?period=` | detalhe, métricas, comparações, leitura |
| `GET /api/notifications` | `{ notifications[] }` |
| `GET /api/settings` | `{ account, simulated, rows[] }` |
| `POST /auth/logout` | encerra a sessão |

Conectar é uma navegação de página inteira para `GET /auth/instagram` — não é
`fetch`. O backend redireciona para a Meta e volta para a raiz com `?connected=1`
ou `?error=<mensagem>`.

**Os valores já vêm formatados** pelo servidor: `"158.400"`, `"8,2%"`,
`"+18%"`, `"+6 pts vs. mês anterior"`. A interface exibe como recebe, sem
recalcular nem reformatar. Os anéis recebem `pct` de 0 a 100 e as barras do
gráfico também.

Exemplo do que `/api/overview` devolve:

```json
{
  "period": { "id": "30", "label": "30 dias", "days": 30 },
  "score": { "value": 77, "delta": "+6 pts vs. mês anterior",
             "components": { "reach": 82, "engagement": 82, "growth": 56 } },
  "chart": { "bars": [{ "label": "Sem 1", "pct": 67 }], "line": [64, 69, 67, 72] },
  "metrics": [{ "label": "Alcance total", "value": "158.400", "delta": "+18%" }],
  "gauges": [{ "label": "Taxa de engajamento", "value": "8,2%", "pct": 82,
               "delta": "-0,2pp", "ring": "#C9A06D" }],
  "topPosts": [{ "id": "p1", "meta": "1 · Reels · 03 ago", "reach": "42.180",
                 "saves": "980", "engagement": "9,4%" }]
}
```

## Comportamentos que não podem faltar

São eles que separam um app de um protótipo:

- **Esqueleto de carregamento** em cada bloco enquanto os dados não chegam —
  não um spinner cobrindo a tela
- **Bloco de erro** com botão "Tentar de novo" quando uma chamada falha
- **Sessão expirada** (HTTP 401): volta para a tela de conectar com o aviso
  "Sua sessão expirou. Conecte a conta novamente."
- **Estado vazio**: "Nenhuma publicação neste formato no período selecionado."
- **Revalidação**: dados com mais de 5 minutos são atualizados em segundo plano,
  mantendo o conteúdo antigo na tela até o novo chegar; voltar ao app depois de
  um tempo fora dispara atualização
- **Aviso de dados simulados**: quando `/api/me` devolve `simulated: true`,
  mostrar em todas as telas a faixa "Dados simulados — a conta ainda não está
  ligada ao Instagram"
- **Sem variação para comparar**: quando `delta` vier `null`, mostrar
  "sem base" em tom apagado, e não um `+0%` inventado

## O que fazer depois de publicar no Lovable

Pegar a URL do projeto e defini-la em `ALLOWED_ORIGINS` no backend, separando
por vírgula se houver mais de uma (o domínio de preview e o de produção). Sem
isso o navegador bloqueia as chamadas e o app fica vazio.

Com `ALLOWED_ORIGINS` preenchido o cookie passa a `SameSite=None; Secure`, o que
exige https nos dois lados — o que já é o caso em qualquer hospedagem real.
