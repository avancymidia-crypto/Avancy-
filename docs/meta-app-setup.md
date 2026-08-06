# Ligando o app aos dados reais do Instagram

Este é o caminho para sair de `DATA_PROVIDER=mock` e passar a ler as métricas
de verdade. O código já está pronto dos dois lados — o que falta é o cadastro
na Meta, que só você pode fazer.

Reserve tempo: a parte técnica leva uma tarde, mas o **App Review** da Meta é
uma revisão humana e costuma levar de alguns dias a algumas semanas.

---

## Antes de começar

Três pré-requisitos que não dá para contornar:

1. **A conta do Instagram precisa ser Business ou Creator.** Conta pessoal não
   expõe métricas na API. Converte em: Instagram → Configurações → Tipo de
   conta e ferramentas.
2. **Essa conta precisa estar vinculada a uma Página do Facebook.** A API do
   Instagram é acessada *através* da Página — sem vínculo, o app não encontra a
   conta e a conexão falha com uma mensagem explicando isso.
3. **Uma política de privacidade publicada, com URL própria.** A Meta exige no
   App Review. Precisa dizer quais dados você coleta, para quê, e como o
   usuário pede exclusão.

---

## 1. Criar o app na Meta

1. Entre em [developers.facebook.com/apps](https://developers.facebook.com/apps)
   e clique em **Criar app**.
2. Caso de uso: **Outro** → tipo **Empresa**.
3. Dê o nome (ex.: "Avancy Métricas") e vincule ao seu Business Manager.

Anote o **ID do app** e a **Chave secreta** em Configurações → Básico. São eles
que vão em `META_APP_ID` e `META_APP_SECRET`.

> A chave secreta é uma senha. Nunca a coloque no Git, nem em código do
> navegador. Ela vive só no `.env` do servidor — que já está no `.gitignore`.

## 2. Adicionar os produtos

No painel do app, adicione:

- **Login do Facebook** — é o que faz o OAuth.
- **Instagram Graph API** — é o que dá acesso às métricas.

## 3. Configurar o redirecionamento

Em **Login do Facebook → Configurações**, no campo *URIs de redirecionamento
do OAuth válidos*, coloque exatamente:

```
https://SEU-DOMINIO/auth/instagram/callback
```

Precisa bater caractere por caractere com o `PUBLIC_URL` do seu `.env` mais
`/auth/instagram/callback`. Divergência aqui é a causa mais comum de erro no
fluxo — a Meta recusa com "URL bloqueada".

Para testar na sua máquina, use um túnel (ngrok, Cloudflare Tunnel) e cadastre
a URL https que ele gerar. A Meta não aceita `http://localhost` em produção.

## 4. Preencher o .env

```bash
cp .env.example .env
```

```env
PUBLIC_URL=https://SEU-DOMINIO
SESSION_SECRET=<gere com o comando abaixo>
DATA_PROVIDER=instagram
META_APP_ID=<seu app id>
META_APP_SECRET=<sua chave secreta>
```

Gere o segredo de sessão:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Testar antes do App Review

Em modo de desenvolvimento o app já funciona — mas **só para contas que você
listar como testadoras**. Em *Funções do app*, adicione sua conta como
Administrador ou Testador. Aceite o convite e conecte pelo app.

É aqui que você confirma que tudo funciona antes de pedir revisão. Use este
momento para conferir se os números batem com o que o Instagram mostra
nativamente.

## 6. Pedir as permissões (App Review)

O app pede quatro permissões, todas sujeitas a revisão:

| Permissão | Para quê |
| --- | --- |
| `instagram_basic` | Ler o perfil e a lista de publicações |
| `instagram_manage_insights` | Ler alcance, salvamentos, impressões — o coração do app |
| `pages_show_list` | Encontrar a Página vinculada à conta |
| `pages_read_engagement` | Ler os dados da Página |

Para cada uma, a Meta pede:

- **Explicação de uso** — por que o app precisa daquilo. Seja concreto:
  "exibir ao próprio dono da conta o alcance e o engajamento das suas
  publicações, em um painel privado".
- **Vídeo de demonstração** — uma gravação de tela mostrando o fluxo inteiro:
  login, autorização, e a tela usando aquele dado. Sem o vídeo, é recusa certa.
- **Instruções de teste** — o revisor precisa reproduzir. Se o app exige conta
  própria, forneça credenciais de teste.

> Recusa é comum na primeira tentativa e quase sempre por vídeo incompleto ou
> explicação genérica. A Meta diz o motivo — corrija e reenvie.

## 7. Publicar

Aprovado, mude o app para o modo **Ativo** no topo do painel. A partir daí
qualquer conta profissional pode conectar.

---

## O que a API entrega — e o que não entrega

Vale calibrar a expectativa antes de trocar a chave:

| O app mostra | Situação na API real |
| --- | --- |
| Alcance | Direto de `/insights`. Confiável. |
| Curtidas, comentários, salvamentos, compartilhamentos | Somados das publicações do período. Confiável. |
| Impressões | **Descontinuada** no nível da conta a partir da v22. O código usa o alcance como aproximação. |
| Crescimento de seguidores | `follower_count` só cobre **30 dias**. Em 90 dias, o valor é estimado a partir da média diária. |
| Score Avancy | Não existe na Meta — é calculado em `server/score.js` a partir de alcance, engajamento e crescimento. |
| Alertas | Não existe feed de notificações na API. São gerados a partir dos próprios números. |
| "Leitura da Avancy" | Sem texto editorial vindo da API: o provider real gera uma leitura por regras. |

Os limites de janela também mudam o que dá para mostrar: insights de conta
cobrem até 2 anos, mas cada requisição pega no máximo 30 dias — por isso
períodos longos são montados em blocos.

## Se algo falhar

| Sintoma | Causa provável |
| --- | --- |
| "URL bloqueada" no login | `PUBLIC_URL` diferente do redirecionamento cadastrado |
| "Nenhuma conta profissional encontrada" | Conta pessoal, ou sem Página vinculada |
| Números zerados | Conta virou profissional há pouco — insights começam na conversão |
| "O acesso à conta expirou" | Token de 60 dias venceu; basta reconectar |
| Erro de permissão | App ainda em desenvolvimento e a conta não está em *Funções do app* |
