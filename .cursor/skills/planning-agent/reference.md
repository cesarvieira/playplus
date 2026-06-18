# Planning Agent — Referência Play+

Material de apoio para breakdown técnico e planejamento de iterações. Fonte de verdade completa: `.cursorrules`, `docs/api.md`, `docs/stack.md`, `docs/folder-structure.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — **fase 06**; saída → `dev-agent` (fase 07).

---

## Entrada e handoff

| Entrada | Quando invocar `planning-agent` |
|---------|----------------------------------|
| Da `architect-agent` | US ou proposta com parecer **aprovado** (ADR Aceito quando aplicável) |
| Da `requirements-agent` | US puramente backend/worker — sem UI e **sem decisão arquitetural pendente** |
| Da `ux-agent` | US com `apps/web` ou `apps/admin` **aprovadas** — após `architect-agent` se houver decisão técnica relevante |
| Direto do usuário | Épico, bloco de US ou pedido de "planejar a próxima iteração" |

**O que enviar ao Planning Agent:**

- User Stories com IDs (`US-*`), critérios de aceite e mapeamento agregado/superfície
- Aprovação UX (se houver UI) — componentes/composables sugeridos
- Capacidade desejada da iteração em pontos (opcional; padrão 8–13 pts solo)
- US ou tasks já em andamento (para evitar conflito de ordem)

**Saída:** breakdown em tasks, ordem de execução, DoR validado → handoff para `dev-agent`.

---

## Definition of Ready (DoR) Play+

Item **não entra na iteração** se faltar:

| Critério | O que verificar |
|----------|-----------------|
| **Critérios de aceite** | Given/When/Then ou lista objetiva — sem termos vagos ("rápido", "bonito") |
| **Mapeamento** | Pilar + agregado + superfície por US |
| **Contratos** | Rotas/eventos em `docs/api.md` definidos ou spike agendado para incerteza |
| **UX** | Aprovação da `ux-agent` quando houver `apps/web` ou `apps/admin` |
| **Arquitetura** | Sem red flags (upload binário na API, transcode síncrono, import entre apps, polling onde há WS) |
| **Dependências** | US predecessoras identificadas (ex.: login antes de progresso) |
| **Escopo** | US grande (3+ superfícies ou pipeline HLS completo) já quebrada pela `requirements-agent` |

---

## Capacidade e pontuação

### Fibonacci

Use 1, 2, 3, 5, 8, 13. Justifique cada pontuação com superfície e risco.

| Pontos | Guia Play+ (solo) |
|--------|-------------------|
| **1** | Ajuste pontual — schema, tipo em `shared`, copy de erro, migration trivial |
| **2** | Rota CRUD simples, composable pequeno, teste manual claro |
| **3** | Use case + camadas DDD em um módulo, componente com estados loading/erro |
| **5** | Integração cross-package (api + shared + um frontend), WebSocket handler, job worker simples |
| **8** | Pipeline parcial (presigned + enqueue), player HLS com progresso, auth refresh rotation |
| **13** | Épico inteiro mal quebrado — **quebrar antes de planejar** |

### Capacidade referência (desenvolvedor solo)

| Contexto | pts/iteração sugerido |
|----------|------------------------|
| MVP, aprendizado + infra | 5–8 pts |
| Rotina estabelecida | 8–13 pts |
| Pipeline HLS ou worker novo | reduzir 30–50% — imprevistos FFmpeg/VPS são comuns |

Se o usuário informar histórico ("última iteração: 10 pts entregues"), use esse número como referência.

---

## Matriz de complexidade por superfície

| Superfície | Tasks típicas | Armadilhas (inflam estimativa) |
|------------|---------------|--------------------------------|
| `packages/shared` | Tipos, DTOs, enums, erros | Breaking change → impacto em web + admin + api + worker |
| `apps/api` | domain, use cases, rotas, schemas WS | Lógica em `http/`, enfileirar job sem idempotência, refresh rotation |
| `packages/worker` | Job transcode, upload HLS, thumbnail | FFmpeg args, retry/Sentry, paths storage, CDN |
| `apps/web` | Player, catálogo, progresso | HLS + seek, `VIDEO_NOT_READY`, WS auth via query token |
| `apps/admin` | Upload presigned, JobQueue, tabelas | Upload direto storage, status via WS (não polling) |
| Infra/Docker | compose, env vars MinIO↔R2 | Troca de ambiente sem mudar código |

Ordem canônica de implementação: **shared → api (domain/application/infra/http) → migration → worker → frontend**.

---

## Spikes comuns (timebox)

Use spike quando a estimativa variar mais de 2 pontos Fibonacci sem investigação:

| Incerteza | Timebox sugerido | Objetivo do spike |
|-----------|------------------|-------------------|
| Perfil FFmpeg na VPS | 0,5–1 dia (2–3 pts) | Validar resoluções, tempo de transcode, uso de CPU/RAM |
| Presigned upload MinIO/R2 | 0,5 dia (1–2 pts) | TTL, CORS, fluxo admin → storage |
| WebSocket auth + eventos | 0,5–1 dia | `?token=`, `video.status`, `player.progress` ponta a ponta |
| HLS playback + CDN | 0,5–1 dia | `master.m3u8` servido, seek, erro de segmento |
| BullMQ retry + dead letter | 0,5 dia | Comportamento após retry esgotado → `status: error` + Sentry |

Spike **não entrega feature** — entrega decisão documentada (README, comentário em PR ou nota para `docs/api.md`).

---

## Red flags no planejamento

Lista arquitetural completa: [architect-agent/reference.md](../architect-agent/reference.md). Bloqueie ou exija spike/refino se a task implicar:

- Upload binário passando pela API
- Transcodificação síncrona na rota HTTP
- Polling de status de transcode ou progresso do player
- Import entre apps
- Lógica de negócio em `http/` ou `infra/`
- Expor credenciais R2 ao cliente
- Task única > 8 pts ou > 3 dias
- US sem critérios de aceite testáveis

---

## Exemplo de breakdown — US-VID-002 Enfileirar transcode

```markdown
## US-VID-002 — Enfileirar job de transcodificação HLS

**Agregado(s):** Video
**Superfície(s):** packages/shared, apps/api, packages/worker

### Tasks técnicas

| Task | Descrição | Estimativa | Dependência | Superfície |
|------|-----------|------------|-------------|------------|
| T01 | Enum `VideoStatus`, DTOs de job e erro `JOB_ALREADY_QUEUED` em shared | 1 pt | — | packages/shared |
| T02 | Use case `EnqueueTranscode` + regra idempotência (job já na fila) | 3 pts | T01 | apps/api (domain + application) |
| T03 | Producer BullMQ + rota `POST /videos/:id/transcode` + schema | 3 pts | T02 | apps/api (infra + http) |
| T04 | Job processor stub + atualização `status: processing` + emit WS | 5 pts | T01, T03 | packages/worker |
| T05 | Teste manual: enqueue → job na fila → evento `video.status` | 2 pts | T04 | — |

### Riscos e incertezas
- T04 pode inflar se FFmpeg real entrar no mesmo escopo — manter stub ou spike FFmpeg separado (US-VID-003)

### Ordem de execução recomendada
1. T01 → T02 → T03
2. T04 (depende de fila Valkey no compose)
3. T05

### Pontuação total: 14 pts → **quebrar em duas iterações** (T01–T03 = 7 pts; T04–T05 = 7 pts)

### Cabe na iteração? parcialmente — iter 1: T01–T03; iter 2: T04–T05 (+ spike FFmpeg se necessário)
```

---

## Exemplo de breakdown — US-WS-001 Retomar reprodução (com UI)

```markdown
## US-WS-001 — Retomar reprodução de onde parei

**Agregado(s):** WatchSession, Video
**Superfície(s):** packages/shared, apps/api, apps/web

### Tasks técnicas

| Task | Descrição | Estimativa | Dependência | Superfície |
|------|-----------|------------|-------------|------------|
| T01 | Tipos `WatchProgress`, DTO `UpdateProgressDto` | 1 pt | — | packages/shared |
| T02 | Migration `watch_progress` + upsert no use case | 3 pts | T01 | apps/api |
| T03 | Handler WS `player.progress` + persistência | 3 pts | T02 | apps/api |
| T04 | `useProgress` + envio ~10s durante playback | 3 pts | T03 | apps/web |
| T05 | `VideoPlayer` seek inicial em `progress.position` + UX "Continuar" | 5 pts | T04, US-VID ready | apps/web |

### Ordem de execução recomendada
1. T01 → T02 → T03 (backend/WS)
2. T04 → T05 (frontend — após vídeo `ready` disponível)

### Pontuação total: 15 pts → duas iterações (backend 7 pts + frontend 8 pts)

### DoR
- [x] Critérios de aceite testáveis
- [x] UX aprovada (VideoPlayer, useProgress)
- [ ] Dependência US-VID-003 (`status: ready`) — bloqueia T05
```

---

## Checklist de saída para implementação

Ao finalizar o breakdown, inclua:

- [ ] Tasks ordenadas com dependências explícitas
- [ ] Tipos/DTOs listados para `packages/shared`
- [ ] Rotas e eventos WS novos ou alterados → `docs/api.md`
- [ ] Migrations PostgreSQL (se houver)
- [ ] Módulo DDD em `apps/api/src/modules/[dominio]/`
- [ ] Jobs em `packages/worker/jobs/` (se mídia)
- [ ] Componentes/composables em `apps/web` ou `apps/admin`
- [ ] Testes manuais por persona (viewer vs admin)
- [ ] Pontos de Sentry (api, worker, nuxt) se task tratar falhas silenciosas

---

## Handoff de outras skills

### Da Requirements Agent

Entrada: US com critérios de aceite, agregado/superfície, dependências.

Se houver UI → usuário deve passar pela `ux-agent` **antes** do planning. Se pular UX, sinalize DoR incompleto.

### Da UX Agent

Entrada: US aprovadas + componentes/composables mapeados + eventos WS e erros tipados com copy.

Planning quebra em tasks alinhadas ao inventário de `docs/folder-structure.md` (`VideoPlayer`, `UploadForm`, etc.).

### Para Dev Agent

Entrega tasks ordenadas com dependências, pontos e superfície. O `dev-agent` implementa na ordem **T01 → T02 → …** — ver [dev-agent/reference.md](../dev-agent/reference.md).

Não substitui o desenvolvedor — entrega sequência executável. Commits seguem Conventional Commits em português (`.cursorrules`).
