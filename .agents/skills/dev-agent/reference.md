# Dev Agent — Referência Play+

Material de apoio para implementação, refatoração e revisão de código. Fonte de verdade completa: `AGENTS.md`, `docs/api.md`, `docs/stack.md`, `docs/folder-structure.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — **fase 07** (última); entrada típica do `planning-agent`.

---

## Quando invocar

| Situação                | Exemplos                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| **Após planning**       | Task T02–T05 com DoR satisfeito; ordem shared → api → worker → frontend |
| **Durante iteração**    | Implementar US, corrigir bug, escrever teste, refatorar módulo DDD      |
| **Spike concluído**     | Codificar decisão documentada (presigned, WS auth, FFmpeg args)         |
| **Revisão de PR local** | Verificar aderência a DDD, pipeline e regras de dependência             |

**Entrada típica:** task do `planning-agent`, US com critérios de aceite, bug report, pedido de refatoração ou snippet a completar.

**Saída:** código implementado ou proposto, testes sugeridos, impactos cross-package, commits sugeridos.

---

## Superfícies e responsabilidades

| Superfície          | O que implementar                    | Onde colocar                                             |
| ------------------- | ------------------------------------ | -------------------------------------------------------- |
| `packages/shared`   | Tipos, DTOs, enums, erros tipados    | `src/types/`, `src/dtos/`, `src/enums/`, `src/errors/`   |
| `apps/api`          | Módulos DDD por agregado             | `src/modules/[dominio]/{domain,application,infra,http}/` |
| `apps/api` (global) | DB, Redis, storage, Sentry           | `src/infra/`, `src/config/`                              |
| `packages/worker`   | Jobs FFmpeg, upload HLS              | `src/jobs/`, `src/processors/`, `src/config/`            |
| `apps/web`          | Viewer — player, catálogo, progresso | `pages/`, `components/`, `composables/`, `stores/`       |
| `apps/admin`        | Upload, fila, gestão                 | `pages/`, `components/`, `composables/`                  |

**Comunicação permitida:**

```
apps/*  →  packages/shared
apps/api  →  BullMQ/Valkey  →  packages/worker
```

---

## Padrões por superfície

### `packages/shared`

```typescript
// Tipos — sem lógica, sem imports de framework
export type Video = {
  id: string;
  title: string;
  status: VideoStatus;
  streamUrl?: string;
};

// Erros tipados — usados em api e worker
export class VideoNotFoundError extends Error {
  readonly code = 'VIDEO_NOT_FOUND' as const;
}
```

- Exportar tudo via barrel (`index.ts`) quando o projeto já usar esse padrão
- Enum string literal ou `as const` — alinhado a `docs/api.md`
- Breaking change → listar consumidores: api, worker, web, admin

### `apps/api` — camadas DDD

| Camada         | Pode                                             | Não pode                             |
| -------------- | ------------------------------------------------ | ------------------------------------ |
| `domain/`      | Entities, VOs, regras puras, erros de domínio    | Fastify, DB, BullMQ, HTTP            |
| `application/` | Use cases, orquestração domain + ports           | Schemas HTTP, SQL direto             |
| `infra/`       | Repositories, producers BullMQ, storage S3       | Regras de negócio                    |
| `http/`        | Rotas, schemas JSON, mapeamento request/response | Lógica de negócio, queries complexas |

**Rota Fastify (padrão):**

```typescript
// http/routes.ts — fina; delega ao use case
fastify.post(
  '/v1/videos/:id/transcode',
  {
    schema: transcodeSchema,
    preHandler: [authenticate, requireAdmin],
  },
  async (request, reply) => {
    const result = await enqueueTranscode.execute({
      videoId: request.params.id,
      userId: request.user.id,
    });
    return reply.status(202).send(result);
  },
);
```

**Use case (padrão):**

```typescript
// application/enqueue-transcode.ts
export class EnqueueTranscode {
  constructor(
    private readonly videoRepo: VideoRepository,
    private readonly queue: TranscodeQueue,
  ) {}

  async execute(input: { videoId: string; userId: string }) {
    const video = await this.videoRepo.findById(input.videoId);
    if (!video) throw new VideoNotFoundError();
    if (video.status !== 'uploaded') throw new VideoNotReadyError();
    // idempotência — JOB_ALREADY_QUEUED
    await this.queue.enqueue(video.id);
    return { jobId: video.id, status: 'queued' };
  }
}
```

**Erros HTTP:**

```typescript
// Mapear erros de domínio → status + code tipado
if (error instanceof VideoNotFoundError) {
  return reply.status(404).send({
    error: { code: 'VIDEO_NOT_FOUND', message: 'Vídeo não encontrado' },
  });
}
```

### `packages/worker`

```typescript
// jobs/transcode.job.ts
export async function processTranscode(job: Job<TranscodePayload>) {
  const { videoId } = job.data;
  try {
    await updateVideoStatus(videoId, 'processing');
    await emitWs('video.status', { videoId, status: 'processing' });
    const hlsOutput = await ffmpegProcessor.transcode(job.data.sourcePath);
    await storageUpload.uploadHls(videoId, hlsOutput);
    await updateVideoStatus(videoId, 'ready');
    await emitWs('video.status', { videoId, status: 'ready' });
  } catch (err) {
    Sentry.captureException(err);
    await updateVideoStatus(videoId, 'error');
    await emitWs('video.error', { videoId, message: 'Falha na transcodificação' });
    throw err; // BullMQ retry
  }
}
```

- Retry com backoff — não retry infinito em erro permanente (arquivo corrompido)
- Paths storage consistentes com presigned upload do admin
- Nunca importar código de `apps/api`

### `apps/web` e `apps/admin`

```typescript
// composables/useAuth.ts
export function useAuth() {
  const accessToken = useState<string | null>('accessToken', () => null);

  async function login(credentials: LoginDto) {
    const { data, error } = await useFetch('/v1/auth/login', {
      method: 'POST',
      body: credentials,
    });
    if (error.value) throw error.value;
    accessToken.value = data.value.accessToken;
  }

  return { accessToken, login, logout };
}
```

```typescript
// composables/useProgress.ts — WebSocket, não polling
export function useProgress(videoId: Ref<string>) {
  const ws = useWebSocket(`/ws?token=${accessToken.value}`);
  watch(currentTime, (time) => {
    if (time % 10 < 1) {
      ws.send({ event: 'player.progress', data: { videoId: videoId.value, position: time } });
    }
  });
}
```

- Pinia para estado global (`auth`, `catalog`) — composables para lógica por feature
- Admin: upload direto ao storage via presigned URL — nunca credencial R2 no bundle
- Tratar `409 VIDEO_NOT_READY` antes de montar player HLS

#### `apps/admin` — tema visual (obrigatório)

Fonte canônica: [`apps/admin/docs/theme.md`](../../../apps/admin/docs/theme.md).

| Regra           | Detalhe                                                        |
| --------------- | -------------------------------------------------------------- |
| Cores           | `peach-*`, `status-*` — nunca hex nem paleta Tailwind genérica |
| Tipografia      | `text-pl-*` — não `text-sm` / `text-xs` / `text-2xl`           |
| Ícones / mídia  | `size-pl-icon*`, `size-pl-media-*` — não `size-4` / `size-12`  |
| Padrão repetido | Classe `pl-*` em `app/assets/css/theme/components.css`         |
| Token novo      | `app/assets/css/theme/tokens.css` (`@theme`)                   |
| Overlays        | `pl-toast-host`, `z-pl-toast` — não `z-[60]` / `top-20`        |
| Componentes     | Preferir `PlButton`, `PlInput`, `PlModal`, `PlToast`           |

Anti-patterns de tema (nunca gerar em `.vue` do admin):

```vue
<!-- ❌ -->
<h1 class="text-2xl text-gray-900">...</h1>
<div class="fixed top-20 z-[60] bg-white">...</div>

<!-- ✅ -->
<h1 class="pl-page-title">...</h1>
<div class="pl-toast-host">...</div>
```

---

## Anti-patterns (nunca gerar)

Lista arquitetural completa: [architect-agent/reference.md](../architect-agent/reference.md). Resumo para implementação:

| Anti-pattern                             | Correção Play+                              |
| ---------------------------------------- | ------------------------------------------- |
| Upload binário na API                    | Presigned URL → MinIO/R2                    |
| Transcode síncrono na rota               | `POST .../transcode` → BullMQ job           |
| Polling de status/progresso              | WebSocket `video.status`, `player.progress` |
| Import app → app                         | Tipos em `shared`; fila api↔worker          |
| Lógica de negócio em `http/` ou `infra/` | Use case em `application/`                  |
| `access_token` em localStorage           | Memória + refresh httpOnly                  |
| Credenciais R2 no frontend               | Presigned com TTL curto                     |
| `any` explícito no TypeScript            | Tipos de `packages/shared`                  |
| SQL string concatenado                   | Parameterized queries / ORM                 |
| Catch genérico sem re-throw ou Sentry    | Log + Sentry nos pontos críticos            |
| Multi-tenancy / `TenantId`               | Fora de escopo — plataforma pessoal         |

---

## Checklist pós-implementação

Use antes de considerar a task concluída:

### Monorepo e DDD

- [ ] Agregado correto (User / Video / WatchSession)
- [ ] Camadas respeitadas — regras em `domain/`, orquestração em `application/`
- [ ] Nenhum import app → app
- [ ] Tipos novos/alterados em `packages/shared` quando compartilhados

### Contratos

- [ ] Rotas seguem `/v1/modulo/recurso/:id`
- [ ] Erros com `code` tipado alinhado a `docs/api.md`
- [ ] Eventos WebSocket documentados se novos ou alterados
- [ ] `docs/api.md` atualizado se contrato mudou

### Pipeline de mídia (se aplicável)

- [ ] Upload presigned — API não recebe binário
- [ ] Transcode via job — rota retorna 202, não bloqueia
- [ ] Idempotência de enqueue (`JOB_ALREADY_QUEUED`)
- [ ] WS emite `video.status` / `video.error`
- [ ] Reprodução só com `status: ready`

### Segurança

- [ ] Rotas admin com role adequada
- [ ] Secrets só em env vars — nada no repo
- [ ] WS autenticado via `?token=` quando aplicável
- [ ] Storage: cliente nunca vê credenciais R2

### Qualidade

- [ ] Testes sugeridos/implementados para `domain/` e use cases críticos
- [ ] Loading/error states no frontend
- [ ] Sentry nos catch de worker e falhas silenciosas da API
- [ ] Migration reversível ou plano de rollback (se DB)

### Entrega

- [ ] Commit(s) em Conventional Commits PT-BR
- [ ] Critérios de aceite da US verificáveis manualmente

---

## Testes — onde e o quê

| Camada            | Tipo                 | Exemplos                                |
| ----------------- | -------------------- | --------------------------------------- |
| `domain/`         | Unitário             | Regras de status, VOs, validações puras |
| `application/`    | Unitário (mocks)     | Use cases com repos/queues mockados     |
| `http/`           | Integração           | Rotas + schema validation + auth        |
| `packages/worker` | Integração           | Job processor com FFmpeg/storage mock   |
| Frontend          | Component/composable | Estados loading/erro, composable auth   |

Prioridade Play+: regras de `VideoStatus`, idempotência de enqueue, upsert `watch_progress`, tratamento `VIDEO_NOT_READY`.

Não adicione testes triviais que só assertam mock — cubra comportamento real de negócio.

---

## Matriz de impacto cross-package

Ao alterar um artefato, verifique:

| Artefato alterado              | Verificar                                        |
| ------------------------------ | ------------------------------------------------ |
| Tipo/DTO/enum/erro em `shared` | api, worker, web, admin — breaking?              |
| Rota REST em `docs/api.md`     | Composables dos dois frontends                   |
| Evento WebSocket               | web (player/progresso), admin (status transcode) |
| Migration PostgreSQL           | Rollback; dados existentes em dev                |
| Job BullMQ payload             | api producer + worker consumer — mesma shape     |
| Env var nova                   | `.env.example`, compose dev/prod, README         |

---

## Exemplo — implementar task T03 (rota transcode)

**Entrada:** Task T03 do planning — `POST /videos/:id/transcode` + producer BullMQ

**Saída esperada:**

```markdown
## Resumo

Enfileira transcodificação HLS para vídeo com status `uploaded`. Agregado Video, superfície apps/api.

## Arquivos

- packages/shared/src/enums/video-status.ts (se ainda não existir)
- apps/api/src/modules/video/application/enqueue-transcode.ts
- apps/api/src/modules/video/infra/bullmq-transcode-queue.ts
- apps/api/src/modules/video/http/transcode.schema.ts
- apps/api/src/modules/video/http/routes.ts

## Impactos

- packages/worker: consumer deve aceitar mesmo payload (T04)
- docs/api.md: rota já documentada — sem alteração

## Testes sugeridos

- Unit: EnqueueTranscode rejeita vídeo não encontrado → VideoNotFoundError
- Unit: EnqueueTranscode rejeita job duplicado → JOB_ALREADY_QUEUED
- Integração: POST sem auth → 401; POST com viewer → 403

## Riscos

- Nenhum — não toca binário nem FFmpeg síncrono

## Checklist

- [x] Use case em application/
- [x] Rota fina com schema JSON
- [x] Idempotência de enqueue
- [ ] Worker T04 pendente
```

---

## Exemplo — bugfix progresso não persiste

**Entrada:** Progresso do player reseta ao recarregar a página

**Investigação:**

1. `useProgress` envia WS a cada ~10s?
2. Handler `player.progress` faz upsert em `watch_progress`?
3. GET vídeo retorna `progress.position`?
4. `VideoPlayer` faz seek inicial?

**Escopo mínimo:** corrigir apenas a camada com falha — não refatorar player inteiro.

---

## Handoffs

### Do Planning Agent

Recebe tasks ordenadas com dependências, pontos e superfície. Implemente na ordem **T01 → T02 → …**; não pule `shared` ou migration. Entrada típica após [planning-agent](../planning-agent/SKILL.md) — ver [../FLUXO.md](../FLUXO.md).

### Para Architect Agent

Escalar quando a task exigir desvio de baseline (novo serviço, mudança de contrato não documentada, padrão não coberto por ADR). Ver [architect-agent/reference.md](../architect-agent/reference.md).

### Commits

Formato: `<tipo>: <descrição minúscula>` em português (BR).

Exemplos:

- `feat: adiciona rota de enqueue de transcode`
- `fix: corrige upsert de progresso no websocket`
- `refactor: extrai use case enqueue-transcode`
- `test: cobre idempotência de job na fila`

---

## Escala e escopo

Play+ é plataforma **pessoal e privada**. Não gere:

- `TenantId`, row-level multi-tenancy ou isolamento por organização
- Billing, assinaturas ou quotas por plano
- Sharding, load balancer ou multi-worker sem pedido explícito

Otimize para: uma VPS, um worker, catálogo pessoal (dezenas/centenas de vídeos), baixa concorrência WebSocket.
