# Gerar e Refinar Task — Referência Play+ (GitHub Issues)

Material de apoio para criação e refinamento de issues alinhadas ao monorepo Play+.
Fonte de verdade: `.cursorrules`, `docs/api.md`, `docs/stack.md`, `docs/folder-structure.md`.

**Fluxo:** [../FLUXO.md](../FLUXO.md) — fase **06b**; entrada do `planning-agent` ou issue/texto a refinar; saída → `dev-agent`.

---

## Relação com planning-agent

| Situação                                  | Skill                           |
| ----------------------------------------- | ------------------------------- |
| Quebrar US em tasks **no chat**           | `planning-agent`                |
| Publicar breakdown **aprovado** no GitHub | `gerar-task` (modo Gerar)       |
| Melhorar issue existente ou rascunho      | `gerar-task` (modo Refinar)     |
| US nova sem breakdown                     | `planning-agent` → `gerar-task` |
| Breakdown já no chat                      | `gerar-task` direto             |

---

## Superfícies e agregados Play+

Catálogo para **labels** (superfície + `pts-*`) e frontmatter (prioridade, agregado). Usar valores **exatos** abaixo.

### Labels de superfície (obrigatória — uma por issue)

| Label    | Escopo                                     | Quando usar                                   |
| -------- | ------------------------------------------ | --------------------------------------------- |
| `shared` | `packages/shared/**`                       | Tipos, DTOs, enums, erros compartilhados      |
| `api`    | `apps/api/**`                              | Módulos DDD, rotas `/v1`, WebSocket handlers  |
| `worker` | `packages/worker/**`                       | Jobs BullMQ, FFmpeg, upload storage           |
| `web`    | `apps/web/**`                              | Frontend público — catálogo, player, login    |
| `admin`  | `apps/admin/**`                            | Painel admin — upload, vídeos, usuários, jobs |
| `infra`  | Docker, CI, compose, env, tooling monorepo | Deploy, pipeline, dependências globais        |
| `spike`  | Qualquer                                   | Investigação timeboxed — não entrega feature  |

### Agregados (corpo/frontmatter — não label obrigatória)

| Agregado       | Módulo API                            | Domínio                         |
| -------------- | ------------------------------------- | ------------------------------- |
| `Video`        | `apps/api/src/modules/video/`         | Upload, transcode HLS, catálogo |
| `User`         | `apps/api/src/modules/user/`          | Auth, roles viewer/admin        |
| `WatchSession` | `apps/api/src/modules/watch-session/` | Progresso, retomada             |

### Como escolher superfície

1. **Contrato cross-app** → `shared` (primeira issue da cadeia)
2. **Rota REST/WS, use case, migration** → `api` (+ agregado no corpo)
3. **Job FFmpeg, fila, processor** → `worker`
4. **Página/composable `apps/web`** → `web`
5. **Página/composable `apps/admin`** → `admin`
6. **CI, Docker, Turborepo, lockfile** → `infra`
7. **Só documentação** → label `documentation` (sem superfície de app se for doc pura)
8. **Refatoração em ≥2 apps** → **issues separadas** por superfície, não `infra` como catch-all de feature

### Anti-padrões

| ❌ Evitar                              | ✅ Usar                                    |
| -------------------------------------- | ------------------------------------------ |
| Issue com `api,web`                    | Duas issues + `--blocked-by`               |
| Label `VideoPlayer` ou path de arquivo | `web` + detalhe na descrição               |
| Task de CI com label `api`             | `infra`                                    |
| Upload binário na API                  | `api` + presigned URL (descrever na issue) |
| Transcode síncrono na rota HTTP        | `api` enfileira + `worker` processa        |

---

## Mapeamento rotas → superfície

### `apps/web` (planejado / `docs/folder-structure.md`)

| Rota / área                    | Superfície | Notas                               |
| ------------------------------ | ---------- | ----------------------------------- |
| `/` — catálogo                 | `web`      | Listagem de vídeos                  |
| `/login`                       | `web`      | Auth viewer                         |
| `/[id]` — player               | `web`      | HLS, `usePlayer`, `useProgress`     |
| Composables compartilhados web | `web`      | `useAuth`, stores `auth`, `catalog` |

### `apps/admin` (planejado)

| Rota / área                           | Superfície | Notas                        |
| ------------------------------------- | ---------- | ---------------------------- |
| `/login`                              | `admin`    | Auth admin                   |
| `/videos`                             | `admin`    | Listagem, upload, transcode  |
| `/users`                              | `admin`    | Gestão usuários 🔒           |
| `/jobs`                               | `admin`    | Fila / status jobs           |
| `UploadForm`, `VideoTable`, WS status | `admin`    | Sem polling — `video.status` |

### `apps/api` — módulos

| Path                              | Superfície       | Agregado                                      |
| --------------------------------- | ---------------- | --------------------------------------------- |
| `modules/video/`                  | `api`            | Video                                         |
| `modules/user/`                   | `api`            | User                                          |
| `modules/watch-session/`          | `api`            | WatchSession                                  |
| `src/infra/` (DB, Redis, storage) | `api`            | Transversal — citar na descrição              |
| `src/config/`                     | `api` ou `infra` | Plugins globais → `api`; env deploy → `infra` |

### Transversal / infra

| Path                                            | Superfície      |
| ----------------------------------------------- | --------------- |
| `.github/workflows/**`                          | `infra`         |
| `docker-compose.yml`, `docker-compose.prod.yml` | `infra`         |
| `pnpm-workspace.yaml`, `turbo.json`             | `infra`         |
| `docs/**` (sem código)                          | `documentation` |

---

## Convenção de labels Play+

### Criar se não existirem

```bash
gh label list --limit 100
# Tipo
gh label create "bug" --description "Comportamento incorreto vs aceite ou docs/api.md" --color "DC2626"
gh label create "enhancement" --description "Nova capacidade ou task de implementação" --color "0EA5E9"
gh label create "documentation" --description "Somente docs, sem código de produção" --color "2563EB"
gh label create "spike" --description "Investigação timeboxed — não entrega feature" --color "EA580C"
# Superfície
gh label create "shared" --description "packages/shared — contratos" --color "7C3AED"
gh label create "api" --description "apps/api — módulos DDD, REST, WebSocket" --color "059669"
gh label create "worker" --description "packages/worker — BullMQ, FFmpeg" --color "D97706"
gh label create "web" --description "apps/web — frontend público" --color "DB2777"
gh label create "admin" --description "apps/admin — painel administrativo" --color "4F46E5"
gh label create "infra" --description "Docker, compose, CI, env, tooling" --color "475569"
```

| Grupo      | Label           | Cor            | Significado  |
| ---------- | --------------- | -------------- | ------------ |
| Tipo       | `bug`           | vermelho       | defeito      |
| Tipo       | `enhancement`   | azul claro     | feature/task |
| Tipo       | `documentation` | azul           | só docs      |
| Tipo       | `spike`         | laranja escuro | investigação |
| Superfície | `shared`        | violeta        | contratos    |
| Superfície | `api`           | verde          | backend      |
| Superfície | `worker`        | âmbar          | fila/FFmpeg  |
| Superfície | `web`           | rosa           | viewer       |
| Superfície | `admin`         | índigo         | painel admin |
| Superfície | `infra`         | ardósia        | ops/CI       |

### Labels de story points (`pts-*`)

Uma issue → **exatamente uma** label `pts-*`. Story points **não** vão no corpo da issue.

```bash
# Gradiente de complexidade: verde (fácil) → amarelo → laranja → vermelho (desmembrar)
gh label create "pts-0.5" --description "Story points 0.5 — trivial" --color "BBF7D0"
gh label create "pts-1" --description "Story points 1 — simples" --color "4ADE80"
gh label create "pts-2" --description "Story points 2 — baixa incerteza" --color "22C55E"
gh label create "pts-3" --description "Story points 3 — moderada" --color "EAB308"
gh label create "pts-5" --description "Story points 5 — complexa" --color "F97316"
gh label create "pts-8" --description "Story points 8 — avaliar desmembramento" --color "DC2626"
```

| Label     | Fibonacci | Cor (semântica)       |
| --------- | --------- | --------------------- |
| `pts-0.5` | 0.5       | verde claro — trivial |
| `pts-1`   | 1         | verde — simples       |
| `pts-2`   | 2         | verde médio           |
| `pts-3`   | 3         | amarelo — moderada    |
| `pts-5`   | 5         | laranja — complexa    |
| `pts-8`   | 8         | vermelho — desmembrar |

Ao refinar ou reestimar: remover label `pts-*` anterior (`--remove-label pts-3`) antes de adicionar a nova.

Filtrar no board/lista: `label:pts-3`, `label:api label:pts-5`, etc.

### Labels padrão GitHub

| Label           | Quando usar                                        |
| --------------- | -------------------------------------------------- |
| `bug`           | Comportamento incorreto vs aceite ou `docs/api.md` |
| `enhancement`   | Nova capacidade ou task de implementação           |
| `documentation` | Só docs                                            |

### Hierarquia milestone → issues

**Épico = milestone.** Não criar issue `[Épico]`.

| Papel       | Mecanismo                                                |
| ----------- | -------------------------------------------------------- |
| Épico       | Milestone (`iter-01-foundation`, `v0-vertical-slice`, …) |
| Task        | Issue com `--milestone "<nome>"`                         |
| Dependência | `--blocked-by` entre issues                              |

---

## Milestone como épico

### Template descrição do milestone

```markdown
## [ETD-01 / US-VID-007] — Título da entrega

## Objetivo

[Entrega agrupada]

## Escopo

**Dentro:** ...
**Fora:** ...

## Critérios de aceite

- [ ] ...

## Issues

- [ ] #3 — título
- [ ] #4 — título

## Ordem sugerida

1. #3 → #4 e #5 em paralelo → #6

## Fonte

- [ETD-01 (Wiki)](https://github.com/cesarvieira/playplus/wiki/ETD-01-Root-e-Infra)
- [docs/planning/iter-01-foundation.md](docs/planning/iter-01-foundation.md)
```

### Criar ou atualizar milestone

```bash
# Criar (se não existir)
gh api repos/{owner}/{repo}/milestones \
  -f title="iter-01-foundation" \
  -f description="$(cat tasks/iter-01-foundation/milestone-body.md)" \
  -f state=open

# Atualizar descrição (épico já publicado, issues criadas)
gh api repos/{owner}/{repo}/milestones/1 \
  -X PATCH \
  -f description="$(cat tasks/iter-01-foundation/milestone-body.md)"
```

### Criar issue no milestone

```bash
gh issue create --title "Scaffold monorepo pnpm + Turborepo + TypeScript base" \
  --label infra,enhancement,pts-3 \
  --milestone "iter-01-foundation" \
  --body-file tasks/iter-01-foundation/01-scaffold.md
```

### Issue com dependência

```bash
gh issue create --title "Configurar ESLint 9 flat config e Prettier" \
  --label infra,enhancement,pts-2 \
  --milestone "iter-01-foundation" \
  --blocked-by 3 \
  --body-file tasks/iter-01-foundation/02-eslint.md
```

### Listar issues do milestone

```bash
gh issue list --milestone "iter-01-foundation" --json number,title,labels,state
```

### Migrar épico issue legado para milestone

```bash
# 1. Copiar corpo da issue épico para milestone-body.md
gh issue view 2 --json body -q .body > tasks/iter-01-foundation/milestone-body.md

# 2. Atualizar milestone
gh api repos/{owner}/{repo}/milestones/1 -X PATCH -f description="$(cat tasks/iter-01-foundation/milestone-body.md)"

# 3. Fechar issue épico
gh issue close 2 --comment "Épico representado pelo milestone iter-01-foundation."
```

**Não usar** `--parent` em novas issues. Issues com `parent_issue_url` legado permanecem funcionais via milestone.

---

## Metadados no corpo da issue

**Story points:** somente via label `pts-*` — **não** no corpo.

Prioridade e agregado: **frontmatter YAML** no topo do corpo — **não** repetir a tabela narrativa "Metadados sugeridos" do chat.

```markdown
---
**Prioridade:** alta | média | baixa
**Agregado:** Video
**US origem:** US-VID-007
---
```

Labels na issue (exemplo): `api`, `enhancement`, `pts-3`

### Prioridade

| Valor | Critério Play+                                      |
| ----- | --------------------------------------------------- |
| alta  | Pipeline HLS, auth, reprodução, segurança, bloqueio |
| média | Feature planejada (default)                         |
| baixa | Nice-to-have, cosmético                             |

---

## Refinar issue existente — comandos

### Ler issue

```bash
gh issue view 43 --json number,title,body,labels,state
```

### Snapshot (obrigatório antes de editar)

```bash
gh issue view 43 --json title,body,labels \
  -q '"## Snapshot antes do refinamento\n\n**Título:** \(.title)\n\n**Labels:** \(.labels | map(.name) | join(", "))\n\n**Corpo:**\n\n\(.body)"' \
  > .tmp-snapshot.md
gh issue comment 43 --body-file .tmp-snapshot.md
```

### Editar após confirmação do usuário

```bash
gh issue edit 43 \
  --title "Implementar GET /v1/videos com paginação no módulo video" \
  --body-file refined-body.md \
  --add-label "api,enhancement,pts-3" \
  --remove-label "web,pts-2"
```

### PowerShell — body em arquivo

```powershell
$body = @"
---
**Prioridade:** média
**Agregado:** Video
**US origem:** US-VID-007
---

## Contexto
...
"@
$body | Out-File -Encoding utf8 refined-body.md
gh issue edit 43 --body-file refined-body.md --add-label "api,pts-3"
```

### Artefatos locais (opcional)

Salvar em `tasks/#43/` ou `tasks/issue-43/`:

- `snapshot.md` — cópia do comentário de snapshot
- `*-refinamento.md` — pré-visualização completa (com metadados narrativos)
- `issue-body.md` — corpo pronto para `gh issue edit` (só frontmatter + seções Jira-free)

---

## Template corpo issue

### Milestone (épico)

Ver [§ Milestone como épico](#milestone-como-épico) — conteúdo vai em `description` do milestone, não em issue.

### Issue (task)

```markdown
---
**Prioridade:** média
**Agregado:** Video
**US origem:** US-VID-007
---

## Contexto

[Task dentro do milestone; estado atual no repo]

## O que deve ser desenvolvido

[Camadas DDD, arquivos-alvo]

## Detalhes técnicos

### packages/shared

- Tipos/DTOs: [...]

### Banco de dados

- Migration: [...]

### API / WebSocket

- `GET /v1/videos` — docs/api.md
- Eventos: video.status

### packages/worker

_(omitir se N/A)_

### Frontend

_(omitir se N/A — issue separada web/admin)_

## Critérios de aceite

- [ ] [Testável 1]
- [ ] [Testável 2]
- [ ] [Testável 3]

## Artefatos esperados

- `apps/api/src/modules/video/http/...`

## Relacionamentos

- Milestone: `iter-02-video-backend`
- Depende de: #43
```

### Issue refinada (modo Refinar — com original preservado)

```markdown
[texto e links originais da issue — inalterados]

---

## Contexto

...

## Solução proposta

...

## Critérios de aceite

- [ ] ...
```

---

## Comandos gh — modo Gerar

Ver [§ Milestone como épico](#milestone-como-épico) para fluxo completo.

Resumo:

1. `gh api ... milestones` — criar ou atualizar milestone
2. `gh issue create --milestone "..."` — criar tasks (sem `--parent`)
3. `gh issue create --blocked-by N` — dependências entre tasks
4. Atualizar `description` do milestone com `#N` reais

---

## Ordem de implementação

```
packages/shared
  ↓
migration (PostgreSQL)
  ↓
apps/api — domain → application → infra → http
  ↓
packages/worker (se mídia)
  ↓
apps/web / apps/admin
```

---

## Exemplo — US-VID-007 Painel admin

**Milestone:** `iter-04-admin-ui`

| #   | Labels        | Título                                                  | blocked-by |
| --- | ------------- | ------------------------------------------------------- | ---------- |
| 43  | shared, pts-1 | Tipos listagem VideoListItem em shared                  | —          |
| 44  | api, pts-3    | GET /v1/videos com paginação e filtro status            | 43         |
| 45  | api, pts-3    | Eventos WS video.status e video.error                   | 44         |
| 46  | admin, pts-5  | Página listagem com tabela e estados vazio/loading/erro | 44         |
| 47  | admin, pts-3  | Atualização tempo real via WS sem polling               | 45, 46     |

---

## Exemplo — US-VID-002 Transcode

| #   | Labels        | Título                                          |
| --- | ------------- | ----------------------------------------------- |
| 50  | shared, pts-1 | TranscodeJobDto em packages/shared              |
| 51  | api, pts-5    | Migration videos + EnqueueTranscodeUseCase      |
| 52  | worker, pts-8 | Processor FFmpeg HLS 4s (240p–1080p) → quebrar  |
| 53  | api, pts-3    | Handlers WS video.status / video.error          |
| 54  | admin, pts-3  | Ações Iniciar transcodificação e Tentar de novo |

---

## Anti-patterns no breakdown e refinamento

- Upload binário na API, transcode síncrono, polling em vez de WS
- Import entre apps, lógica de negócio em `http/`
- Credenciais R2 no cliente
- Issue única com `pts-8`+ ou misturando `api` + `web` sem desmembrar
- Duas labels `pts-*` na mesma issue
- Story points no corpo em vez de label `pts-*`
- Remover links/anexos ao refinar
- Editar issue sem snapshot em comentário
- Publicar sem confirmação explícita do usuário
- Criar issue `[Épico]` ou usar `--parent` — épico = milestone

---

## Critérios de aceite — bons vs ruins

| ✅ Bom                                                  | ❌ Ruim             |
| ------------------------------------------------------- | ------------------- |
| `GET /v1/videos retorna 200 com data[] e meta.total`    | `Listagem funciona` |
| `UI não faz polling — só WS video.status`               | `Status atualiza`   |
| `409 JOB_ALREADY_QUEUED exibido na ação Tentar de novo` | `Erro tratado`      |
| `Vídeo com status != ready retorna 409 VIDEO_NOT_READY` | `Validação ok`      |

---

## Integração com PRs e dev-agent

- Branch: `feat/43-video-list-shared` ou `issue-43`
- Commit: `feat(shared): adiciona VideoListItem (#43)`
- PR body: `Closes #43` ou `Relates to milestone iter-04-admin-ui`

---

## Links úteis no corpo

- `docs/requirements/v0-vertical-slice/US-VID-007.md`
- `docs/api.md`
- `docs/planning/iter-01-foundation.md`
- `docs/adr/ADR-004-role-hierarchy.md`
