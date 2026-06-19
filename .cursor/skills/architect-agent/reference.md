# Architect Agent — Referência Play+

Material de apoio para revisões arquiteturais e ADRs. Fonte de verdade completa: `.cursorrules`, `docs/api.md`, `docs/stack.md`, `docs/folder-structure.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — **fase 05**; entrada de `requirements-agent` ou `ux-agent`; saída → `planning-agent`.

**Anti-patterns:** esta referência é a **fonte canônica** de anti-patterns arquiteturais — outras skills linkam aqui em vez de duplicar.

---

## Quando invocar

| Situação | Exemplos |
|----------|----------|
| **Antes do planning** | Nova integração (storage, fila, auth), mudança de contrato cross-app, desenho de módulo DDD |
| **Durante spike** | Validar FFmpeg na VPS, TTL presigned, auth WebSocket — documentar resultado como ADR ou nota |
| **Revisão de proposta** | PR ou ideia que toca `shared` + 2 frontends, ou pipeline HLS |
| **Red flag do planning/requirements** | Upload na API, polling, import entre apps — pedir parecer antes de estimar |

**Entrada típica:** US com critérios de aceite, proposta técnica, spike notes, draft de ADR ou pergunta arquitetural.

**Saída:** parecer estruturado, ADR em `docs/adr/`, alternativas e handoff para `planning-agent` (se aprovado) ou retorno à `requirements-agent`/`ux-agent` (se contrato ou fluxo precisar ajuste).

---

## Superfícies e limites

| Superfície | Papel arquitetural | Decisões típicas |
|------------|-------------------|------------------|
| `packages/shared` | Contratos — tipos, DTOs, enums, erros | Breaking change → impacto em api, worker, web, admin |
| `apps/api` | DDD por módulo; HTTP + WS; enfileira jobs | Onde colocar use case vs infra; idempotência de enqueue |
| `packages/worker` | FFmpeg, upload HLS, retry/Sentry | Job design, paths storage, não bloquear API |
| `apps/web` | Viewer — player, catálogo, progresso WS | Composables, auth em memória, HLS + seek |
| `apps/admin` | Upload presigned, fila, gestão | Status via WS, nunca credencial R2 no cliente |
| Infra Docker | postgres, valkey, minio/R2 | Troca ambiente só por env vars |

**Comunicação permitida:**

```
apps/*  →  packages/shared
apps/api  →  BullMQ/Valkey  →  packages/worker
```

Qualquer seta adicional (app → app, worker → api HTTP direto) exige ADR com justificativa forte.

---

## Anti-patterns (recusa ou ressalva obrigatória)

| Anti-pattern | Por que é problema no Play+ | Alternativa |
|--------------|----------------------------|-------------|
| Upload binário na API | Esgota memória/CPU da VPS; viola pipeline presigned | Presigned URL → MinIO/R2 |
| Transcode síncrono na rota HTTP | Timeout, bloqueio do event loop Fastify | `POST .../transcode` → job BullMQ |
| Polling de status/progresso | Carga desnecessária; contrato já define WS | `video.status`, `video.error`, `player.progress` |
| Import entre apps | Acoplamento; quebra deploy independente | Tipos em `packages/shared`; fila api↔worker |
| Lógica de negócio em `http/` ou `infra/` | Viola DDD; difícil testar | Use cases em `application/` |
| Credenciais R2 no frontend | Superfície de ataque; vazamento de storage | Presigned com TTL curto, só admin |
| `access_token` em localStorage | XSS expõe sessão | Memória no cliente + refresh httpOnly |
| Job sem idempotência | Re-enqueue duplica FFmpeg na VPS | Checar fila / `JOB_ALREADY_QUEUED` |
| Expor segmentos HLS sem CDN (prod) | Latência e custo; credenciais | Cloudflare na frente do bucket |
| Multi-tenancy / billing | Fora do escopo do produto | Escopo explícito do usuário primeiro |
| Novo padrão sem ADR | Decisão não rastreável | ADR em `docs/adr/` |

---

## Checklist de revisão arquitetural

Use antes de aprovar proposta ou fechar ADR:

### Monorepo e DDD

- [ ] Agregado identificado (User / Video / WatchSession)
- [ ] Superfície(s) corretas — sem misturar viewer e admin na mesma decisão sem necessidade
- [ ] Nenhum import app → app
- [ ] Regras de negócio em `domain/` + orquestração em `application/`
- [ ] `packages/shared` sem lógica nem dependências externas

### Pipeline de mídia (se aplicável)

- [ ] Upload direto ao storage (presigned)
- [ ] Transcode via BullMQ, não HTTP bloqueante
- [ ] Eventos WS para status/erro de transcode
- [ ] Reprodução só com `status: ready` — `409 VIDEO_NOT_READY` documentado
- [ ] Falha após retry → `status: error` + Sentry no worker

### Contratos e compatibilidade

- [ ] Rotas seguem `/v1/modulo/recurso/:id`
- [ ] Erros tipados (`code` + `message`)
- [ ] Mudança em `shared` ou WS avaliada em web + admin
- [ ] Migration PostgreSQL reversível ou plano de rollback descrito

### Segurança

- [ ] Rotas admin com role adequada
- [ ] Refresh rotation respeitada se tocar auth
- [ ] WS autenticado via `?token=` quando aplicável
- [ ] Storage: env vars, sem secrets no repo

### Operação (VPS solo)

- [ ] FFmpeg não compete com API no mesmo processo (worker separado)
- [ ] Jobs com retry/backoff — não retry infinito em falha permanente
- [ ] Sentry nos três pontos se nova falha silenciosa (api, worker, nuxt)
- [ ] Carga estimada aceitável para um worker e um Postgres no mesmo host

---

## Baseline já decidida (`docs/stack.md`)

Não exige ADR duplicado — referencie o doc existente:

| Decisão | Status |
|---------|--------|
| Fastify + TypeScript | Aceito |
| PostgreSQL | Aceito |
| BullMQ + Valkey (vs pg-boss) | Aceito — ver alternativa em stack.md |
| MinIO dev / R2 prod | Aceito |
| FFmpeg HLS 4s, 240p–1080p | Aceito |
| Nuxt 4 + Vue 3 (web + admin) | Aceito |
| Sentry (api, worker, nuxt) | Aceito |
| Docker Compose | Aceito |

**ADR novo** quando: trocar stack, adicionar serviço (ex.: segundo worker), mudar contrato de auth, alterar estratégia HLS/CDN, ou introduzir padrão não listado acima.

---

## Convenção de ADRs

**Pasta:** `docs/adr/`

**Nome do arquivo:** `ADR-001-titulo-kebab-case.md`

**Numeração:** sequencial; consulte arquivos existentes antes de criar novo.

**Status:**

| Status | Significado |
|--------|-------------|
| Proposto | Em discussão — não implementar até Aceito |
| Aceito | Decisão vigente — implementação alinhada |
| Depreciado | Substituído por ADR posterior — manter histórico |

**Revisão:** toda ADR deve ter gatilho de revisão (evento ou data), especialmente após MVP de Video ou crescimento do catálogo.

---

## Exemplo — revisão sem ADR

**Entrada:** "E se a API recebesse o upload multipart e repassasse ao MinIO?"

```markdown
## Resumo
Proposta de upload binário via Fastify com proxy para MinIO.

## Alinhamento
- Centraliza validação de metadados na API ✓

## Anti-patterns detectados
- **Crítico:** upload binário na API — viola `.cursorrules` e esgota VPS
- **Crítico:** duplica responsabilidade já coberta por presigned URL

## Impacto cross-package
- apps/api (memória, timeout), apps/admin (fluxo UploadForm)

## Alternativas
- **Presigned (baseline):** cliente → storage direto; API só emite URL e registra metadados
- **Multipart presigned (S3):** se metadados complexos, validar após upload via callback/job — ADR separado

## Veredito
**Recusar.** Manter presigned. Próximo passo: se dúvida for TTL/CORS, spike timeboxed (ver planning-agent reference).
```

---

## Exemplo — ADR aceito

```markdown
# ADR-002: Progresso de reprodução via WebSocket com upsert PostgreSQL

**Data:** 2026-06-18
**Status:** Aceito

## Contexto
Retomar reprodução exige persistir posição com baixa latência sem polling a cada segundo.

## Decisão
Cliente envia `player.progress` via WebSocket ~10s; API faz upsert em `watch_progress` (PostgreSQL).

## Alternativas consideradas
- **Polling REST:** simples, mas carga e latência desnecessárias — rejeitado
- **Beacon on unload only:** perde progresso em crash/tab kill — complementar no futuro, não substituto

## Consequências
- **Positivas:** alinhado a docs/api.md; baixa carga na VPS
- **Negativas:** WS auth via query token; reconexão deve reenviar token

## Impacto Play+
- **Agregado(s):** WatchSession
- **Superfície(s):** apps/api, apps/web, packages/shared
- **Contratos:** sim — evento `player.progress`
- **Breaking change:** não

## Revisão em
Após MVP WatchSession — avaliar batching ou intervalo adaptativo se carga WS crescer
```

---

## Handoffs

### Da Requirements / UX Agent

Quando US implicar decisão não coberta por baseline (novo agregado, novo serviço, mudança de contrato), invocar `architect-agent` **antes** de `planning-agent`.

### Para Planning Agent

Parecer **aprovado** + ADR **Aceito** (se aplicável) → `planning-agent` quebra em tasks → `dev-agent` implementa. Ver [../FLUXO.md](../FLUXO.md).

### Retorno a Requirements / UX

Se veredito exigir mudança de contrato ou fluxo de tela, indicar ajuste na US ou revisão UX antes de planejar.

---

## Escala e capacidade (contexto Play+)

Não avalie "10 vs 1000 tenants". Avalie:

| Dimensão | Pergunta |
|----------|----------|
| **VPS** | CPU/RAM aguenta mais um job FFmpeg concorrente? |
| **Worker** | Fila única — backlog cresce linearmente com uploads? |
| **PostgreSQL** | Índices e upserts em `watch_progress` escalam com horas assistidas? |
| **Storage/CDN** | Egress R2 + cache Cloudflare para catálogo pessoal (dezenas/centenas de vídeos)? |
| **WebSocket** | Conexões simultâneas baixas — ainda assim, auth e heartbeat definidos? |

Escala enterprise (sharding, multi-worker, LB) só com pedido explícito e ADR dedicado.
