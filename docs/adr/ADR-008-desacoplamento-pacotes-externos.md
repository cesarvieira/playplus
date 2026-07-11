# ADR-008: Desacoplamento de pacotes externos via wrappers

**Data:** 2026-07-10  
**Status:** Aceito

## Contexto

Pacotes de terceiros usados diretamente em muitos arquivos criam risco: trocar ou remover a lib no futuro exige caçar e alterar todos os call sites, com risco de quebra e de configuração divergente (ex.: `slugify` chamado com options repetidas). Ao mesmo tempo, **encapsular tudo** é over-engineering — libs de framework (Fastify, Nuxt, Vue, Zod) são inseparáveis e envolvê-las só adiciona indireção.

Precisamos de uma regra clara de **quando e onde** isolar uma dependência externa, aplicável a cada módulo novo.

## Decisão

Toda dependência externa cai em **uma de três** categorias. O critério é a combinação de: superfície pequena, facilidade de troca, e se a API dela "vaza" tipos/config para o código de domínio.

### 1. Wrapper em `shared` — libs pequenas, puras e trocáveis

Funções puras de superfície mínima (ex.: `slugify`, `gravatar-url`). Encapsular num único ponto; **trocar a lib = editar um arquivo**.

Regras do wrapper:

- **Estreita a API**, não a espelha 1:1 — expõe só o que o domínio precisa e esconde as options (o wrapper é o dono da config padrão).
- **Nome provider-neutro** — o contrato descreve a _intenção_, não o fornecedor. Ex.: `getAvatarUrl()` (não `getGravatarUrl`); Gravatar é detalhe interno trocável.

**Onde mora — quem consome decide:**

| Consumidores                   | Destino                                      | Import             |
| ------------------------------ | -------------------------------------------- | ------------------ |
| 1 módulo da API                | `apps/api/src/shared/<capacidade>/`          | `#shared/*`        |
| 2+ apps (api/worker/web/admin) | `packages/shared/src/<capacidade>/` (barrel) | `@playplus/shared` |

Nomear por **capacidade** (`text/`, `avatar/`, `hash/`), nunca `utils/` genérico (vira lixeira). Nos apps Nuxt, manter um reexport fino em `app/utils/*.ts` só para preservar o auto-import.

Regra de promoção (YAGNI): nasce em `apps/api/src/shared` quando há **1** consumidor; sobe para `packages/shared` quando surge o **2º** app que precisa.

### 2. Repository / Adapter (port) — libs pesadas, com I/O

Banco, storage, filas, cache, logger, crypto (ex.: `drizzle`+`postgres`, `aws-sdk`, `bullmq`, `pino`, `jsonwebtoken`, `ioredis`, `@node-rs/argon2`, `ws`). Ficam atrás de um adapter de **ponto único** na camada `infra/` (ou service no módulo). O adapter **é** a fronteira anti-corrupção; nada fora dele importa a lib.

Tipos também vazam: consumidores dependem de um alias reexportado pelo adapter (ex.: `RedisClient` de `#infra/valkey/client`), não de `import type { Redis } from 'ioredis'`.

### 3. Deixar como está — framework / inseparável

Fastify + `@fastify/*`, Zod, Nuxt/Vue/Pinia/h3, Tailwind, Wrangler. Envolver não desacopla e piora a legibilidade. No front, `hls.js`/`ofetch` isolam-se por **idioma Vue** (composable / camada api-client), não por util em `shared`.

## Alternativas consideradas

- **Encapsular todo pacote externo** (exceto os inseparáveis): aumenta custo de manutenção e indireção sem retorno para libs estáveis/onipresentes como Zod — rejeitado.
- **Não encapsular nada, trocar via find-and-replace quando precisar:** o risco que motiva este ADR — rejeitado.
- **Sempre em `packages/shared`:** obriga o backend a carregar wrappers de front no grafo de módulos e cria camada cross-app antes de existir cross-app — rejeitado em favor da regra de promoção.

## Consequências

- **Positivas:** troca de lib localizada a um arquivo; config padronizada num ponto; fronteiras testáveis; regra objetiva para code review de módulos novos.
- **Negativas:** wrappers isomórficos no barrel de `packages/shared` entram no grafo de módulos de api/worker mesmo sem uso (custo desprezível para libs puras pequenas; se incomodar, expor via subpath export dedicado em vez do barrel).
- Revisa a regra do `packages/shared` em [`folder-structure.md`](../folder-structure.md): além de contratos, passa a aceitar **wrappers finos de desacoplamento** (isomórficos, superfície pequena) — segue proibido use case, serviço e lógica de negócio.

## Impacto Play+

- **Agregado(s):** transversal (nenhum específico)
- **Superfície(s):** `apps/api`, `apps/web`, `apps/admin`, `packages/shared`
- **Contratos:** não altera contratos de API
- **Breaking change:** não

## Revisão em

Quando surgir o 2º provedor de uma mesma capacidade (ex.: outro provedor de avatar) — aí introduzir a estratégia/port explícito, não antes.
