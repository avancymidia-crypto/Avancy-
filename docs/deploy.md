# Colocando o app no ar

O objetivo aqui é ter uma URL https própria para instalar o app no celular.
HTTPS não é opcional: sem ele o navegador não registra o service worker nem
oferece a instalação — o PWA simplesmente não funciona. As três plataformas
abaixo dão HTTPS de graça.

O app já vem configurado para as três. Escolha uma.

---

## Qual escolher

| | Custo | Hiberna? | Como sobe |
| --- | --- | --- | --- |
| **Render** | Grátis | Sim, após 15 min parado (~50s para acordar) | Pelo site, sem instalar nada |
| **Fly.io** | Franquia grátis cobre este app | Não, se `min_machines_running = 1` | CLI |
| **Railway** | ~US$ 5/mês | Não | Pelo site |

**Para começar agora e sem custo: Render.** O incômodo é o cold start — abrir
o app depois de horas parado leva uns 50 segundos na primeira tela. Como as
sessões simuladas ficam no próprio cookie, você continua conectado depois da
hibernação; só a espera incomoda.

**Se for usar de verdade no dia a dia: Fly.io** (região `gru`, São Paulo, com
latência menor) ou Railway. Sem hibernação, abre na hora.

---

## Render

O caminho de um clique:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/avancymidia-crypto/Avancy-)

Abre o Render já apontado para o repositório, lê o `render.yaml` e propõe o
serviço pronto. Basta ter conta (grátis) e autorizar o GitHub.

Pelo painel, se preferir:

1. Faça login em [render.com](https://render.com) com a conta do GitHub.
2. **New → Blueprint** e selecione o repositório `Avancy-`.
3. O Render lê o `render.yaml` e propõe o serviço. Confirme.
4. Aguarde o primeiro build (2 a 3 minutos).

Pronto. A URL sai como `https://avancy-app.onrender.com`.

Não é preciso configurar `PUBLIC_URL`: o app usa a variável `RENDER_EXTERNAL_URL`
que o Render injeta sozinho. O `SESSION_SECRET` é gerado automaticamente na
criação e mantido entre deploys.

Cada push no branch dispara um novo deploy.

## Fly.io

```bash
# instalar a CLI (uma vez)
curl -L https://fly.io/install.sh | sh

fly auth login
fly launch --no-deploy          # aceita o fly.toml que já está no repo

# o segredo de sessão precisa ser fixo, senão cada restart desconecta todo mundo
fly secrets set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

fly deploy
```

A URL sai como `https://avancy-app.fly.dev`. O nome do app precisa ser único no
Fly — se `avancy-app` estiver tomado, o `fly launch` sugere outro e atualiza o
`fly.toml`.

`min_machines_running = 1` no `fly.toml` mantém uma máquina de pé. Se preferir
economizar e aceitar o cold start, troque para `0`.

## Railway

1. Em [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**.
2. Selecione o repositório. O `railway.json` é lido automaticamente.
3. Em **Variables**, adicione:
   ```
   SESSION_SECRET = <gere com o comando abaixo>
   NODE_ENV       = production
   ```
4. Em **Settings → Networking**, clique em *Generate Domain*.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`PUBLIC_URL` não precisa ser definido — o app usa `RAILWAY_PUBLIC_DOMAIN`.

---

## Variáveis que importam

| Variável | Quando | Observação |
| --- | --- | --- |
| `SESSION_SECRET` | **Sempre** | Sem ela, o servidor gera uma nova a cada boot e todo mundo é desconectado a cada deploy ou hibernação |
| `NODE_ENV=production` | Sempre | Liga o cookie `secure` e o cache longo dos estáticos |
| `DATA_PROVIDER` | `mock` até a Meta aprovar | Depois, `instagram` |
| `META_APP_ID` / `META_APP_SECRET` | Só com `instagram` | Pelo painel da plataforma, **nunca** no repositório |
| `PUBLIC_URL` | Só se a detecção automática falhar | Render, Railway e Fly são detectados sozinhos |

> A chave secreta da Meta é uma senha. Se ela algum dia for parar num commit,
> vá em Configurações → Básico no painel da Meta e gere outra: a antiga
> continua valendo até ser trocada.

Um detalhe que pega desprevenido: com `NODE_ENV=production` o cookie de sessão
ganha o atributo `Secure`, e o navegador então só o envia por https. Rodar em
modo produção na sua máquina via `http://localhost` faz o login parecer
quebrado — a conexão acontece e some. Localmente, use o modo padrão
(`npm start` sem `NODE_ENV`).

## Depois de subir

1. Abra a URL no navegador do celular.
2. Conecte (em modo simulado é instantâneo).
3. Instale: **iOS/Safari** → compartilhar → *Adicionar à Tela de Início*.
   **Android/Chrome** → menu ⋮ → *Instalar app*.
4. Abra pelo ícone. Deve abrir em tela cheia, sem barra de navegador.

Para conferir que o PWA está íntegro, rode o Lighthouse (aba *Application* no
DevTools do Chrome) e veja se o manifesto e o service worker aparecem.

## Quando a Meta aprovar

1. Cadastre `https://SUA-URL/auth/instagram/callback` como redirecionamento
   válido no painel da Meta.
2. Defina `META_APP_ID` e `META_APP_SECRET` na plataforma.
3. Troque `DATA_PROVIDER` para `instagram`.
4. Faça o redeploy e reconecte a conta pelo app.

O passo a passo do App Review está em [meta-app-setup.md](meta-app-setup.md).

## Antes de tratar como produção

O que está montado é bom para testar e para uso interno, mas duas coisas
ficariam de fora numa operação séria:

- **Sessões reais vivem em memória.** As simuladas ficam no cookie e sobrevivem
  a restart; as reais, não — quando os tokens da Meta entrarem, um deploy vai
  desconectar quem estiver logado. Trocar `MemoryStore` em `server/session.js`
  por Redis resolve, e a interface já está isolada em get/set/delete.
- **Uma instância só.** Escalar horizontalmente exige o mesmo Redis, senão cada
  instância enxerga sessões diferentes.
