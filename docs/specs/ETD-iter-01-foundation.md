# ETD-01 — Monorepo root e infraestrutura local

> **Tipo:** Especificação Técnica Detalhada  
> **Identificador:** ETD-01  
> **Status:** Aprovado para implementação  
> **Pré-requisito:** nenhum (greenfield)

---

## 1. Visão e escopo

Esta ETD cobre exclusivamente a **raiz do monorepo** e a **infraestrutura local** do Play+ — plataforma pessoal de streaming em **pnpm workspaces + Turborepo**.

| Superfície | Entregável |
|------------|------------|
| **root** | Workspace pnpm, Turborepo, TypeScript base, toolchain de qualidade (testes, lint, typecheck, knip, husky) |
| **infra** | Docker Compose (postgres, valkey, minio), `.env.example`, workflow CodeQL no GitHub |

**Fora desta ETD:** `packages/shared`, `apps/api`, `apps/web`, `apps/admin`, `packages/worker`, nginx, Sentry, pipeline de vídeo, contratos HTTP, autenticação.

**Validação mínima:**

- `pnpm install` resolve o workspace sem erro
- `pnpm test`, `pnpm lint`, `pnpm typecheck` e `pnpm knip` executam na raiz (mesmo com packages ainda vazios ou stub)
- `docker compose up -d` deixa postgres, valkey e minio healthy em ≤ 2 min (máquina 8 GB RAM)
- commit local dispara hook pre-commit do Husky; push/PR dispara CodeQL no GitHub

---

## 2. Monorepo (root)

### 2.1 Estrutura de diretórios

| Caminho | Propósito |
|---------|-----------|
| `pnpm-workspace.yaml` | Declara workspaces `apps/*` e `packages/*` |
| `package.json` | Scripts root, devDependencies da toolchain, `prepare` do Husky |
| `turbo.json` | Pipeline `build`, `dev`, `test`, `lint`, `typecheck` |
| `tsconfig.base.json` | Opções TypeScript compartilhadas |
| `.npmrc` | Política pnpm (hoist desligado por padrão) |
| `.gitignore` | `node_modules`, `dist`, `.env`, `.turbo`, coverage |
| `eslint.config.mjs` | ESLint flat config (root — herança pelos packages) |
| `vitest.config.ts` | Configuração Vitest workspace |
| `knip.json` | Análise de exports/deps não utilizados |
| `.lintstagedrc.json` | Comandos por glob no pre-commit |
| `.husky/pre-commit` | Hook executado antes de cada commit |
| `.github/workflows/codeql.yml` | Análise estática CodeQL |
| `apps/` | Vazio ou stubs mínimos até ETDs posteriores |
| `packages/` | Vazio ou stubs mínimos até ETDs posteriores |

Não criar implementação de apps ou packages nesta ETD — apenas estrutura de workspace e toolchain.

### 2.2 pnpm workspace

| Campo | Valor |
|-------|-------|
| Gerenciador | pnpm 9.x (pinado em `packageManager`) |
| Node | ≥ 20 |
| Workspaces | `apps/*`, `packages/*` |
| Nome root | `playplus` |
| `private` | `true` |

### 2.3 Turborepo

| Task | Comportamento |
|------|---------------|
| `build` | `dependsOn: ["^build"]`, outputs `dist/**` |
| `dev` | `cache: false`, `persistent: true` |
| `test` | sem cache persistente; outputs coverage opcional |
| `lint` | executável em cada package; root pode orquestrar |
| `typecheck` | `dependsOn: ["^build"]` quando packages gerarem artefatos |

Scripts root delegam ao Turbo: `turbo run test`, `turbo run lint`, `turbo run typecheck`.

### 2.4 TypeScript base (`tsconfig.base.json`)

| Opção | Valor |
|-------|-------|
| `target` | ES2022 |
| `module` / `moduleResolution` | NodeNext |
| `strict` | true |
| `esModuleInterop` | true |
| `skipLibCheck` | true |
| `declaration` / `declarationMap` / `sourceMap` | true |
| `noEmit` | true nos packages que só typecheckam |

Cada package futuro estende o base via `extends`.

### 2.5 Scripts root (`package.json`)

| Script | Ação |
|--------|------|
| `prepare` | Inicializa Husky (`husky`) |
| `dev` | `turbo run dev --parallel` |
| `build` | `turbo run build` |
| `test` | `turbo run test` |
| `lint` | `turbo run lint` |
| `typecheck` | `turbo run typecheck` |
| `knip` | `knip` (root) |
| `quality` | Encadeia `lint`, `typecheck`, `test`, `knip` — uso local e CI |

---

## 3. Ferramentas de qualidade

Todas as ferramentas abaixo são instaladas como **devDependencies na raiz**, salvo quando cada package precisar de script próprio no `package.json` local.

### 3.1 Pacotes (visão consolidada)

| Ferramenta | Pacote(s) | Papel |
|------------|-----------|-------|
| Testes | `vitest`, `@vitest/coverage-v8` (opcional) | Unit/integration tests |
| Lint | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier` | Regras TS + desligar conflito com Prettier |
| Formatação | `prettier` | Formatação consistente (complemento ao lint) |
| Typecheck | `typescript` | `tsc --noEmit` por package via Turbo |
| Knip | `knip` | Dead code, exports e deps órfãs |
| Husky | `husky` | Git hooks |
| Pre-commit | `lint-staged` | Só arquivos staged no hook |
| CodeQL | *(GitHub Actions — sem pacote npm)* | SAST no repositório remoto |

### 3.2 Testes (Vitest)

**Objetivo:** framework único de testes para todo o monorepo; packages futuros expõem script `"test": "vitest run"`.

**Instalação:** devDependencies na raiz — `vitest`, `@vitest/coverage-v8` se coverage for exigido desde o início.

**Configuração:**

| Arquivo | Conteúdo esperado |
|---------|-------------------|
| `vitest.config.ts` (root) | `test.workspace` apontando para `apps/*` e `packages/*` que tiverem testes; alias `@playplus/*` quando packages existirem |
| `turbo.json` | Task `test` registrada |
| Package stub | Script `"test": "vitest run --passWithNoTests"` até haver arquivos de teste |

**Convenções:**

- Arquivos de teste: `*.test.ts` ou `*.spec.ts` colocados junto ao código ou em `__tests__/`
- Coverage mínimo não exigido nesta ETD; reporter `text` ou `lcov` configurável
- Testes não dependem de Docker — infra sobe separadamente para testes de integração futuros

**Comando:** `pnpm test` na raiz.

### 3.3 Lint (ESLint + Prettier)

**Objetivo:** regras consistentes em TypeScript; zero warnings no CI e no pre-commit.

**Instalação:** devDependencies — `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier`.

**Configuração:**

| Arquivo | Conteúdo esperado |
|---------|-------------------|
| `eslint.config.mjs` | Flat config ESLint 9+: recommended JS + recommended TypeScript + `eslint-config-prettier`; ignores: `dist`, `node_modules`, `.turbo`, coverage |
| `.prettierrc` (ou `prettier.config.mjs`) | `semi`, `singleQuote`, `trailingComma: all`, `printWidth: 100` — alinhado ao estilo do repo |
| `.prettierignore` | `dist`, `node_modules`, `pnpm-lock.yaml`, `.turbo` |
| `turbo.json` | Task `lint` |
| Package stub | Script `"lint": "eslint ."` |

**Regras mínimas:**

- TypeScript strict-friendly — sem `any` implícito tolerado em código novo
- `@typescript-eslint/no-unused-vars` com args ignore pattern `^_`
- Proibir `console.log` em código de produção (warn ou error); permitir em scripts de tooling

**Comando:** `pnpm lint` na raiz.

### 3.4 Typecheck

**Objetivo:** validação estática TypeScript sem emitir JS — complementar ao ESLint.

**Instalação:** `typescript` na raiz (versão pinada, mesma em todos os packages).

**Configuração:**

| Item | Detalhe |
|------|---------|
| `tsconfig.base.json` | Base compartilhada (§2.4) |
| `tsconfig.json` (root) | `files: []`, `references` para packages quando existirem — ou apenas base até packages surgirem |
| Package futuro | `"typecheck": "tsc --noEmit"` e `extends` do base |
| `turbo.json` | Task `typecheck` com `dependsOn: ["^build"]` quando build gerar `.d.ts` |

**Comando:** `pnpm typecheck` na raiz.

**Pre-commit:** typecheck dos packages afetados via Turbo (`turbo run typecheck --filter=...[HEAD]`) — ver §3.6.

### 3.5 Knip

**Objetivo:** detectar exports não usados, dependências declaradas mas não referenciadas e arquivos órfãos no monorepo.

**Instalação:** devDependency `knip` na raiz.

**Configuração (`knip.json`):**

| Campo | Valor |
|-------|-------|
| `workspaces` | `.` (root), `apps/*`, `packages/*` |
| `entry` | Por workspace: `src/index.ts`, `src/server.ts`, configs de app quando existirem; root: scripts de tooling |
| `project` | `**/*.{ts,tsx}` excluindo `dist`, `node_modules` |
| `ignoreDependencies` | Ferramentas só usadas em CI ou hooks: `husky`, `@vitest/coverage-v8`, etc. — revisar ao adicionar packages |
| `ignoreBinaries` | `docker`, `turbo` se referenciados só em scripts |

**Comando:** `pnpm knip` — exit code ≠ 0 se houver issues.

**Onde roda:** CI em todo PR; local antes de releases. **Não** incluir no pre-commit (lento demais para cada commit).

### 3.6 Husky e pre-commit

**Objetivo:** impedir commit com lint ou typecheck quebrados nos arquivos/packages tocados.

**Instalação:**

1. devDependencies: `husky`, `lint-staged`
2. Script `"prepare": "husky"` no `package.json` root — executa após `pnpm install`
3. Comando inicial: `pnpm exec husky init` — cria `.husky/`

**Hook `.husky/pre-commit`:**

Executa em sequência:

1. `pnpm exec lint-staged` — lint/format nos arquivos staged
2. `pnpm exec turbo run typecheck --filter=...[HEAD]` — typecheck só nos packages alterados

**Configuração `.lintstagedrc.json`:**

| Glob | Comandos |
|------|----------|
| `*.{ts,tsx,mjs,cjs}` | `eslint --fix --max-warnings 0` |
| `*.{ts,tsx,json,md,yml,yaml}` | `prettier --write` |

**Comportamento esperado:**

- Commit abortado se ESLint ou typecheck falhar
- Husky funciona em Windows (Git Bash) e Unix — hook em shell POSIX simples
- Hooks versionados em `.husky/` no repositório

**Fora do pre-commit:** `pnpm test`, `pnpm knip` e CodeQL rodam no CI — não bloquear commit local por testes lentos.

### 3.7 CodeQL (GitHub Actions)

**Objetivo:** análise estática de segurança e qualidade no código TypeScript/JavaScript a cada push e PR.

**Arquivo:** `.github/workflows/codeql.yml`

**Configuração do workflow:**

| Campo | Valor |
|-------|-------|
| Trigger | `push` e `pull_request` em `main`; `schedule` semanal opcional |
| Permissões | `security-events: write`, `actions: read`, `contents: read` |
| Language | `javascript-typescript` |
| Build mode | Sem build customizado nesta fase — CodeQL autobuild para JS/TS |
| Matrix | `ubuntu-latest` |
| Timeout | 360 min (default GitHub) |

**Passos:**

1. Checkout
2. Inicializar CodeQL (`github/codeql-action/init`) com language `javascript-typescript`
3. Autobuild (`github/codeql-action/autobuild`) — ou skip se repo só tiver configs
4. Análise (`github/codeql-action/analyze`) com category `/language:javascript-typescript`

**Pré-requisito:** repositório no GitHub com Actions habilitadas. Alertas visíveis na aba Security → Code scanning.

**Local:** CodeQL **não** roda no Husky — apenas CI.

### 3.8 CI complementar (recomendado)

Workflow separado `.github/workflows/quality.yml` (opcional mas alinhado à ETD):

| Job | Comando |
|-----|---------|
| quality | `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm knip` |

Executar em paralelo com CodeQL no mesmo PR.

---

## 4. Infraestrutura local

### 4.1 Docker Compose

| Serviço | Imagem | Portas host | Healthcheck |
|---------|--------|-------------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 | `pg_isready` |
| `valkey` | `valkey:8-alpine` | 6379 | `redis-cli ping` |
| `minio` | `minio/minio:latest` | 9000 (API), 9001 (console) | endpoint `/minio/health/live` |

| Item | Detalhe |
|------|---------|
| Volumes | `postgres_data`, `minio_data` |
| Rede | bridge default |
| **Não incluir** | nginx, api, worker |

Variáveis de ambiente do postgres dev: database `playplus`, user/password `playplus` — documentadas no `.env.example`.

### 4.2 Inicialização MinIO

Serviço one-shot `minio-init`:

- Imagem: `minio/mc`
- Depende de: `minio` healthy
- Ação: configurar alias S3 local e criar bucket definido por `STORAGE_BUCKET` (default `playplus`) se não existir
- Credenciais root dev: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` = `minioadmin` (documentar troca para outros ambientes)

Bucket deve existir após `docker compose up -d` completo.

### 4.3 Variáveis de ambiente (`.env.example`)

Documentar na raiz — copiar para `.env` local; **nunca** commitar `.env`.

| Variável | Consumidor futuro | Exemplo dev | Notas |
|----------|-------------------|-------------|-------|
| `DATABASE_URL` | api, worker | URL postgres localhost:5432/playplus | |
| `VALKEY_URL` | api, worker | redis://localhost:6379 | |
| `STORAGE_ENDPOINT` | api, worker | http://localhost:9000 | API S3-compatible |
| `STORAGE_BUCKET` | api, worker | playplus | usado pelo minio-init |
| `STORAGE_ACCESS_KEY` | api, worker | minioadmin | |
| `STORAGE_SECRET_KEY` | api, worker | minioadmin | |
| `STORAGE_REGION` | api, worker | us-east-1 | |
| `JWT_SECRET` | api | string ≥ 32 caracteres | placeholder |
| `JWT_ACCESS_TTL_SECONDS` | api | 900 | |
| `JWT_REFRESH_TTL_SECONDS` | api | 604800 | |
| `ADMIN_SEED_EMAIL` | api | admin@playplus.local | placeholder |
| `ADMIN_SEED_PASSWORD` | api | *(definir localmente)* | |
| `API_PORT` | api | 3000 | |
| `API_HOST` | api | 0.0.0.0 | |
| `NODE_ENV` | api | development | |
| `COOKIE_SECURE` | api | false | true em prod |
| `COOKIE_SAME_SITE` | api | lax | strict em prod |

Troca MinIO ↔ Cloudflare R2 em produção **somente** por variáveis `STORAGE_*`.

Credenciais postgres e MinIO ficam exclusivamente em `.env` — defaults sensíveis apenas no Compose para dev local.

---

## 5. Verificação

| # | Critério |
|---|----------|
| 1 | `pnpm install` conclui e executa `prepare` (Husky instalado) |
| 2 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm knip` executam sem erro na raiz |
| 3 | Commit com arquivo `.ts` inválido é **rejeitado** pelo pre-commit |
| 4 | Commit com lint ok **passa** o pre-commit |
| 5 | `docker compose up -d` — postgres, valkey, minio healthy; `minio-init` concluído |
| 6 | `.env.example` lista todas as variáveis com comentário |
| 7 | Push para GitHub dispara workflow CodeQL sem falha de configuração |

---

## 6. Riscos

| Risco | Mitigação |
|-------|-----------|
| Husky não roda no Windows sem Git Bash | Documentar dependência de Git for Windows; hook em shell POSIX |
| Pre-commit lento com typecheck Turbo | Filtro `--filter=...[HEAD]` limita escopo |
| Knip falso positivo em configs root | `ignoreDependencies` / `ignore` ajustáveis |
| RAM insuficiente | Mínimo 8 GB; apenas 3 serviços nesta fase |
| CodeQL autobuild vazio em repo só-config | Normal até existir código TS; workflow deve passar |

---

## 7. Entregas futuras

| Item | ETD / fase posterior |
|------|----------------------|
| `packages/shared`, `apps/api` | ETD-02 |
| Auth JWT (módulo User) | ETD-03 |
| Módulo Video (API REST) | ETD-04 |
| Admin UI | ETD-05 |
| Web UI (auth + catálogo) | ETD-06 |
| Web UI (player HLS) | ETD-07 |
| `packages/worker` | BullMQ + FFmpeg |
| nginx :8080 | Proxy HLS |
| api/worker no Compose | Ambiente containerizado completo |
| Testes de integração com postgres/valkey | Requerem Docker ou testcontainers |
| Sentry | Observabilidade |

---

*ETD-01 · Play+ v0 · Root + Infra*
