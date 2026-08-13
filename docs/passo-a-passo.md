# Do jeito que está até os clientes usando

Passo a passo do que falta para o app ler dados reais do Instagram e virar
ícone no celular dos seus clientes.

São seis fases, em ordem — cada uma depende da anterior. Duas travam por
revisão humana da Meta e não têm como acelerar.

---

## O que já funciona hoje

**O app está no ar:** https://avancy-insights.lovable.app

Abra no celular e ele já instala como ícone. Isso funciona **agora**, sem
depender da Meta — só que com números de exemplo. As fases abaixo são para
trocar esses números pelos reais.

Se o que você quer é mostrar o app para alguém esta semana, isso já está
pronto. As fases resolvem o dado real.

---

## Antes de começar

Três coisas sem as quais nada funciona:

1. **`@avancymidia` precisa ser conta Business ou Creator.** Conta pessoal não
   expõe métricas na API, de jeito nenhum. Verifique em: Instagram →
   Configurações → Tipo de conta e ferramentas.
2. **A conta precisa estar vinculada a uma Página do Facebook.** A API do
   Instagram é acessada *através* da Página. Sem vínculo, o app não encontra a
   conta.
3. **Uma política de privacidade publicada, com URL própria.** A Meta exige
   antes da revisão. Precisa dizer quais dados você coleta, para quê, e como
   alguém pede exclusão.

O item 3 costuma ser o esquecido. Sem ele você trava na Fase 5.

---

## Fase 1 · Criar o app na Meta

**Quem faz:** você · **Tempo:** ~30 minutos

1. Entre em [developers.facebook.com/apps](https://developers.facebook.com/apps)
   e clique em **Criar app**.
2. Escolha o caso de uso **Outro**, e depois o tipo **Empresa**.
3. Dê um nome (ex.: "Avancy Métricas") e vincule ao seu Business Manager.
4. No painel do app, adicione dois produtos:
   - **Login do Facebook**
   - **Instagram Graph API**
5. Vá em **Configurações → Básico** e preencha:
   - URL da Política de Privacidade
   - URL dos Termos de Serviço
   - Instruções de exclusão de dados
6. Ainda em Básico, copie o **ID do app** e a **Chave secreta**.

**Me mande apenas o ID do app.** A chave secreta é uma senha — ela vai direto
no painel da hospedagem, nunca pelo chat.

---

## Fase 2 · Colocar o backend no ar

**Quem faz:** você abre, eu configuro · **Tempo:** ~5 minutos

O app precisa de um servidor para guardar o token da Meta com segurança — isso
não pode ficar no navegador.

Duas formas:

**A.** Instalar o conector do Render nesta conversa (igual você fez com o
Lovable). Aí eu crio o serviço sozinho.

**B.** Clicar no botão e me mandar a URL que aparecer:

```
https://render.com/deploy?repo=https://github.com/avancymidia-crypto/Avancy-
```

Sai algo como `https://avancy-app.onrender.com`.

Com a URL em mãos, **eu faço**: configuro as variáveis, ligo o provider do
Instagram e conecto o app do Lovable ao backend.

---

## Fase 3 · Testar com a sua conta

**Quem faz:** eu configuro, você testa · **Tempo:** ~10 minutos
**Não precisa de App Review**

Esta é a parte que costuma ser mal explicada: **em modo de desenvolvimento o
app já funciona para você.** A Meta libera as permissões para quem tem função
no app, sem revisão nenhuma.

1. No painel da Meta, em **Login do Facebook → Configurações**, cadastre o
   redirecionamento:
   `https://SEU-BACKEND/auth/instagram/callback`
   Precisa bater caractere por caractere. Divergência aqui dá "URL bloqueada".
2. Em **Funções do app**, confirme que sua conta está como Administrador.
3. Abra o app, toque em **Conectar com Instagram** e autorize.

Se der certo, você vê os números reais de `@avancymidia`. A faixa "Dados
simulados" desaparece sozinha.

**É aqui que você descobre se os números batem** com o que o Instagram mostra
nativamente. Vale conferir antes de seguir.

---

## Fase 4 · Verificação do negócio

**Quem faz:** você · **Tempo:** de dias a duas semanas
**Trava por revisão humana**

Para liberar as métricas a terceiros, a Meta exige verificar que a Avancy é uma
empresa real.

1. Em [business.facebook.com](https://business.facebook.com) → **Configurações
   do negócio → Central de Segurança**.
2. Inicie a **Verificação do negócio**.
3. Envie: cartão CNPJ, comprovante de endereço da empresa, e confirme telefone
   ou domínio.

**O que mais reprova:** nome ou endereço divergente entre o cadastro na Meta e
os documentos. Confira se batem exatamente antes de enviar.

---

## Fase 5 · App Review

**Quem faz:** você envia, eu preparo o material · **Tempo:** de 3 a 10 dias úteis
**Trava por revisão humana · Reprovação na primeira tentativa é comum**

Só agora, e só para atender **clientes**. Para você, a Fase 3 já resolveu.

São quatro permissões a solicitar:

| Permissão | Para quê |
| --- | --- |
| `instagram_basic` | Ler o perfil e a lista de publicações |
| `instagram_manage_insights` | Ler alcance, salvamentos, impressões |
| `pages_show_list` | Encontrar a Página vinculada |
| `pages_read_engagement` | Ler os dados da Página |

Para cada uma a Meta pede três coisas:

**Explicação de uso.** Seja concreto. "Exibir ao próprio dono da conta o
alcance e o engajamento das suas publicações, em um painel privado" passa;
"melhorar a experiência do usuário" não.

**Vídeo de demonstração.** Gravação de tela mostrando o fluxo inteiro: abrir o
app, clicar em conectar, a tela de autorização da Meta, e a tela usando aquele
dado específico. **Sem o vídeo completo é reprovação certa** — é o motivo
número um de recusa.

**Instruções de teste.** O revisor precisa reproduzir. Forneça uma conta de
teste com credenciais.

Se reprovar, a Meta diz o motivo. Corrija e reenvie — não é começar do zero.

Depois de aprovado, mude o app para **Ativo** no topo do painel.

---

## Fase 6 · Seus clientes usando

**Quem faz:** cada cliente · **Tempo:** 2 minutos por pessoa

Com o app Ativo, qualquer conta profissional pode conectar.

**O que você manda para o cliente:**

> Abre este link no celular: https://avancy-insights.lovable.app
>
> **iPhone:** botão de compartilhar (quadrado com seta) → *Adicionar à Tela de
> Início*
> **Android:** menu ⋮ → *Instalar app*
>
> Depois é só abrir pelo ícone e tocar em Conectar com Instagram.

**Cada cliente precisa ter:** conta Business ou Creator, vinculada a uma Página
do Facebook. Se a conta for pessoal, não funciona — e o app avisa isso na tela.

Instalado, ele abre em tela cheia, sem barra de navegador. Funciona offline com
os últimos dados carregados.

---

## Resumo do que trava

| Fase | Depende de | Prazo |
| --- | --- | --- |
| 1 · App na Meta | Você | 30 min |
| 2 · Backend no ar | Você abrir, eu configurar | 5 min |
| 3 · Testar com sua conta | Nada além das anteriores | 10 min |
| 4 · Verificação do negócio | **Meta** | dias a 2 semanas |
| 5 · App Review | **Meta** | 3 a 10 dias úteis |
| 6 · Clientes | Fase 5 aprovada | 2 min cada |

**Você usando o app com dados reais: fases 1 a 3, umas duas horas no total.**

**Clientes usando: mais 2 a 4 semanas**, quase tudo esperando a Meta.

---

## O que a API não entrega

Vale saber antes, para não prometer ao cliente o que não dá:

| No app | Na realidade |
| --- | --- |
| Alcance | Direto da API. Confiável. |
| Curtidas, comentários, salvamentos, compart. | Somados das publicações. Confiável. |
| Impressões | **Descontinuada** no nível da conta. O app usa alcance como aproximação. |
| Crescimento de seguidores | Só **30 dias** de histórico. Em 90 dias, é estimativa. |
| Score Avancy | Não existe na Meta — é fórmula sua, em `server/score.js`. |
| Alertas | Não há feed de notificações na API. São gerados dos próprios números. |

---

## Quando algo falhar

| Sintoma | Causa |
| --- | --- |
| "URL bloqueada" no login | Redirecionamento cadastrado difere do configurado |
| "Nenhuma conta profissional encontrada" | Conta pessoal, ou sem Página vinculada |
| Números zerados | Conta virou profissional há pouco — insights começam na conversão |
| "O acesso à conta expirou" | Token de 60 dias venceu; basta reconectar |
| Erro de permissão em cliente | App ainda em desenvolvimento, ou review não aprovado |

Detalhes técnicos de cada fase em [meta-app-setup.md](meta-app-setup.md) e
[deploy.md](deploy.md).
