# Avancy · app mobile

Protótipo navegável do app mobile da **Avancy Mídia** — um painel de métricas do
Instagram para contas profissionais.

Implementação da peça `Avancy App.dc.html`, criada no Claude Design.

## Rodando

Não há build. Qualquer servidor estático serve:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Abrir o `index.html` direto pelo `file://` também funciona, mas um servidor é
preferível para que as fontes carreguem sem avisos de CORS.

## Telas

| Tela | Descrição |
| --- | --- |
| **Conectar** | Autorização da conta do Instagram, com estado de carregamento |
| **Início** | Score Avancy, evolução do alcance, métricas do período, medidores e top posts |
| **Conteúdo** | Biblioteca de publicações com filtro por formato e ordenação por alcance |
| **Detalhe** | Métricas da publicação, comparação com a média da conta e leitura da Avancy |
| **Alertas** | Notificações |
| **Ajustes** | Perfil, preferências e desconexão da conta |

O período (7 / 30 / 90 dias) recalcula score, gráfico, métricas e medidores.

## Estrutura

```
index.html                     Casca da página e moldura do aparelho
assets/css/app.css             Tokens de design e estilos dos componentes
assets/js/app.js               Estado, dados de exemplo e renderização
assets/fonts/                  Nunito e Raleway (subsets variáveis, self-hosted)
assets/avancy-logo-white.svg   Logotipo horizontal
assets/avancy-mark-beige.svg   Símbolo
design/Avancy App.dc.html      Fonte original do Claude Design
design/support.js              Runtime do Claude Design (gerado — não editar)
```

`index.html` + `assets/` é a implementação e não depende de nada externo: sem
CDN, sem framework, sem etapa de build. `design/` guarda a peça original como
referência.

### Layout

Acima de 480px de largura o app aparece dentro de uma moldura de aparelho
(402×874), como no protótipo. Abaixo disso a moldura some e o app ocupa a tela
inteira — é assim que ele se comporta em um celular de verdade ou instalado na
tela de início.

## Dados

Os números são de exemplo, definidos em `assets/js/app.js`:

- `DATA` — métricas por período (`7`, `30`, `90`)
- `POSTS` — as publicações da biblioteca
- `NOTIFICATIONS` — os alertas
- `ACCOUNT` — nome, @ e iniciais da conta

Trocar por dados reais é substituir essas constantes pela resposta da API.

## Diferença em relação ao design

Uma correção foi aplicada na conversão: no comparativo "Alcance" da tela de
detalhe, o design prefixava um `+` fixo em um número que fica negativo para
publicações abaixo da média da conta — três das sete publicações exibiam
`+-48%`. O sinal agora é calculado a partir do valor, e variações negativas
usam um tom neutro em vez do verde de alta.
