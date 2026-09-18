# Brand Automation Engine

Transforme um briefing criativo em peças de campanha validadas e exportáveis — sem
deixar um agente reinventar a sua marca.

A premissa: um modelo generativo é bom em escolher e redigir, e ruim em ser cobrado
por uma especificação. Então ele nunca desenha nada. Ele devolve um **Creative Spec**
— qual template aprovado, qual imagem aprovada, que texto vai em cada slot nomeado —
e o motor faz o resto de forma determinística.

---

## O pipeline

| Estágio | O que acontece | O que é recusado |
| --- | --- | --- |
| **1. Sistema de marca** | Tokens, regras, imagens, tipografia e o logo oficial são registrados — e podem ser editados depois | Chaves desconhecidas, hex malformado, fontes não registradas, arquivos cujos bytes não batem com o tipo declarado |
| **2. Agente criativo** | Devolve exatamente três Creative Specs estruturados | Qualquer saída que não sejam três specs sobre templates e imagens já aprovados |
| **3. Regras de pré-voo** | 12 checagens sobre métricas reais das fontes | Estouro de texto, cores fora da paleta, violações do logo, quebra de área segura — antes de um glifo ser desenhado |
| **4. Renderização** | Slots preenchidos em um DOM interpretado; texto convertido em vetor | Imagens remotas, peças não aprovadas, slots transformados |
| **5. Auditoria pós-render** | Saída revalidada contra o template de origem | Qualquer desvio byte a byte em elemento protegido, viewBox alterado, logo substituído |
| **6. Exportação** | SVG ou PNG | Tudo que falhar nos estágios 3 ou 5 — rechecado a cada requisição |

Uma falha em qualquer estágio interrompe a cadeia. Variações bloqueadas continuam
visíveis no estúdio, com suas checagens reprovadas intactas.

---

## Idiomas

A interface inteira, as mensagens de validação, as justificativas do agente **e o
conteúdo da campanha demo** existem em português e inglês. O padrão é português; o
toggle no topo da tela alterna e guarda a escolha em um cookie.

O idioma não é só uma camada de tela. A copy da campanha é renderizada **dentro do
SVG**, então trocar de idioma faz o servidor semear novamente o workspace demo e o
agente gerar a copy no idioma escolhido. Campanhas que você mesmo gerou permanecem no
idioma em que foram criadas — o arquivo exportado já foi renderizado com aquele texto.

Para que isso funcionasse, o que o servidor produz virou dado em vez de prosa:

- as regras carregam `{ruleId, params}`, e o texto vive nos dicionários;
- a justificativa do agente carrega `{theme, onTheme}`;
- templates gerados carregam um `nameKey` traduzível (templates criados por você
  mantêm o nome que você deu);
- as falhas esperadas viajam como `AppError(chave, params)` e só viram frase na
  borda HTTP, então parser, renderizador e motor de regras seguem sem saber nada
  sobre idioma. Erros de schema usam o locale `pt-BR` do próprio Zod, resolvido por
  requisição — nada de configuração global compartilhada entre pedidos concorrentes.

Assim uma conformidade já gravada pode ser lida em qualquer idioma. Um novo idioma é
um arquivo em `lib/i18n/` — o tipo `Dictionary` é derivado do português, então
qualquer chave faltando vira erro de compilação.

---

## Tipografia da marca

Cada marca começa com as duas famílias embutidas e pode registrar as suas, de dois jeitos:

- **Google Fonts** — você digita o nome da família e o servidor busca o arquivo regular
  uma vez. O arquivo fica guardado com a marca, então a peça exportada nunca depende do
  Google em runtime. Só `fonts.googleapis.com` e `fonts.gstatic.com` são aceitos, e o
  nome passa pelo schema antes de entrar na URL.
- **Upload** — TTF ou OTF até 2 MB, interpretado pelo parser antes de ser aceito. Um
  arquivo que não for uma fonte legível é recusado.

Os tokens da marca só aceitam famílias que ela realmente tem — `familyName` no schema
garante que o valor parece um nome, e a rota confere se a família está registrada.

### O logo aceito

O sanitizador aceita a marcação que Figma e Illustrator realmente exportam —
`fill-rule`, `clip-rule`, `stroke-miterlimit`, `version`, `xml:space`, gradientes e
máscaras declarados localmente. Ficam de fora os elementos que trazem execução ou
busca de recursos: `<style>` (CSS arbitrário pode ter `@import` de outro domínio),
`<use>`, `<filter>` e `<script>`. Referências `url(...)` só valem apontando para um id
do próprio documento.

### Editar uma marca

`PATCH /api/brands` aceita mudanças parciais. O ponto delicado: **os templates guardam
o SVG já resolvido**, com as cores e os nomes de fonte escritos dentro dele. Mudar um
token sem mais nada deixaria toda a geração reprovada na regra de paleta — então os
templates gerados pela factory são refeitos com os novos tokens. Templates que você
escreveu à mão não são tocados, e a resposta diz quantos ficaram de fora para você
conferir.

O lote inteiro — marca e templates refeitos — é gravado de uma vez, em vez de uma
escrita por registro. No modo local isso também evita um `EPERM` intermitente no
Windows, onde renomear o arquivo recém-escrito falha se um antivírus ou indexador
ainda o mantém aberto; o rename ainda assim tenta de novo algumas vezes.

Ao refazer, o corpo do texto é **dimensionado pelas métricas da fonte escolhida**: uma
família mais larga que a anterior encolhe até caber na geometria, em vez de reprovar no
overflow. O ajuste cobre o pior caso realista (uma manchete no limite de caracteres da
marca); uma palavra única gigante continua sendo pega pela regra de overflow, que é a
rede de segurança.

---

## Módulos

```
app/
  page.tsx · campaigns/      Estúdio de campanha — briefing entra, três direções validadas saem
  dashboard/                 Visão geral: contagens, saúde da conformidade, desempenho por regra
  brands/                    Sistema de marca: tokens, regras, biblioteca de imagens, cadastro
  templates/                 Geometria aprovada, contratos de slot, autoria de templates
  architecture/              Como o pipeline garante o que garante
  api/                       workspace · brands · templates · assets · campaigns · export

lib/
  i18n/                      Dicionários pt/en, cookie de idioma e os formatadores
  brand/repository.ts        Persistência: Supabase quando configurado, JSON local caso contrário
  brand/template-factory.ts  Gera os cinco templates padrão a partir dos tokens da marca
  brand/demo.ts              O workspace Serein semeado, por idioma
  agent/provider.ts          Interface CreativeAgentProvider + mock determinístico
  agent/pipeline.ts          Briefing → specs → validação → renderização → auditoria
  renderer/parser.ts         Higienizador de SVG e leitor do contrato de template/slots
  renderer/fonts.ts          Carregamento de fontes e medição de texto
  renderer/render.ts         Preenchimento determinístico de slots e vetorização do texto
  validation/engine.ts       As 12 regras de marca

schemas/                     Objetos estritos do Zod — o único vocabulário aceito
supabase/migrations/         Tabelas, políticas de RLS e o bucket privado de imagens
tests/                       Testes unitários (node:test via tsx)
e2e/                         Testes de navegador (Playwright)
```

---

## Rodando

```bash
npm install
npm run dev            # http://localhost:3000
```

Não é preciso configurar nada. Sem credenciais do Supabase, o app usa um workspace
local persistente em `.data/`, identificado por um cookie httpOnly e semeado com a
marca demo **Serein** — um logo, três fotografias, cinco templates aprovados e uma
campanha.

### Conectando o Supabase

1. Crie um projeto e habilite **anonymous sign-ins** em *Authentication → Sign In /
   Providers*. Sem isso o app não consegue estabelecer identidade de workspace.
2. Aplique `supabase/migrations/` — pelo SQL Editor do painel ou com `supabase db push`.
3. Ponha a URL do projeto e a publishable key em `.env.local` (veja `.env.example`).
4. Confirme com `npm run supabase:verify`.

O app nunca usa a service-role key: o RLS é a única fronteira entre inquilinos, e a
migração aplica um conjunto de políticas por dono às nove tabelas e ao bucket privado `brand-assets`,
que guarda imagens e arquivos de fonte.

A chave primária é sempre **composta**, `(owner_id, id)`. O workspace demo é semeado
com ids fixos e idênticos para todo mundo, então uma PK só em `id` faria o segundo
visitante colidir com as linhas do primeiro — exatamente o caso de um portfólio
público. `supabase:verify` tem um teste de regressão para isso.

> Na Vercel o Supabase é obrigatório — o workspace local em JSON precisa de um
> sistema de arquivos gravável.

---

## Testes

```bash
npm run typecheck      # tsc --noEmit
npm test               # 71 testes unitários
npm run test:e2e       # 24 testes de navegador (requer: npx playwright install chromium)
npm run test:all       # os três
npm run supabase:verify # valida a conexão Supabase, se houver .env.local
```

`supabase:verify` usa as mesmas credenciais do app — publishable key e usuário
anônimo, sem service-role — e confere as tabelas, o bucket, escrita e leitura reais e,
principalmente, o **isolamento entre inquilinos**: um segundo usuário anônimo não pode
ler, baixar nem gravar em nome do primeiro. Como o RLS é a única fronteira de
segurança, ele é testado de verdade em vez de presumido. Cria dois usuários anônimos
descartáveis e limpa as linhas que criou.

Os testes de navegador rodam sempre no workspace local: o `playwright.config.ts` zera
as variáveis do Supabase, e uma asserção falha se a suíte subir conectada — senão cada
teste criaria um usuário anônimo no projeto de verdade.

Os testes unitários cobrem onde errar sai caro: o higienizador de SVG (scripts,
entidades, referências remotas, marcação malformada), o contrato de slots, a medição e
quebra de texto, cada regra do motor de validação, a detecção de adulteração na saída
renderizada, e a recusa do pipeline em renderizar saída malformada do agente.
`brand-system.test.ts` verifica que as quinze combinações de formato × tema produzem um
template que valida contra a marca que o gerou. `i18n.test.ts` verifica que os
dicionários têm o mesmo formato, que nenhuma string ficou vazia, que toda regra e toda
chave de erro têm tradução, e que a copy em português cabe nos glifos das fontes
empacotadas — um acento faltando viraria um retângulo vazio no arquivo exportado. Os
testes de exceção afirmam a **chave** do erro, não a frase, então continuam válidos em
qualquer idioma.

### Uma nota sobre a checagem de origem

`lib/api.ts` rejeita escritas cujo `Origin` não bate com o cabeçalho `Host` — a defesa
contra CSRF. A comparação é deliberadamente com o `Host`, e não com
`new URL(request.url).origin`: o Next deriva aquela origem por conta própria, então
comparar com ela recusava **toda escrita** quando o app era acessado por um endereço
que ele não resolveu — `localhost` enquanto `npm run dev` escuta em `0.0.0.0`, ou
qualquer proxy. `tests/api.test.ts` trava esses casos.

A comparação é de host, não de esquema, porque `Host` não carrega esquema e derivar o
esquema da requisição recriaria o mesmo problema atrás de um proxy TLS.

### Uma nota sobre renderização

O layout lê o cookie de idioma no servidor para evitar um flash de tradução e para
acertar o `<html lang>`. Em troca, as páginas passaram a ser renderizadas sob demanda
em vez de pré-geradas. Para um app de workspace — que já busca seus dados por fetch —
a troca vale a pena.

---

## Trocando o agente

O `MockCreativeAgent` é determinístico para que a demo seja reprodutível e os testes
estáveis. Substitua-o implementando um único método:

```ts
export interface CreativeAgentProvider {
  generateCreativeSpecs(context: AgentContext): Promise<unknown>;
}
```

O tipo de retorno é `unknown` de propósito. O que quer que um modelo produza é
interpretado por `creativeSpecSchema` e reamarrado aos templates e imagens reais da
marca antes de qualquer renderização — um id de template alucinado ou um campo a mais
reprova na leitura. O `AgentContext` inclui o `locale`, então seu provedor sabe em que
idioma escrever. Passe seu provedor como terceiro argumento de `generateCampaign`.
