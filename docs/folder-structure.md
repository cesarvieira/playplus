# Estrutura de pastas

Monorepo com pnpm workspaces e Turborepo. Organizado em **apps** (executáveis) e **packages** (compartilhados).

```
playplus/
├── apps/
│   ├── api/                        # Fastify — backend principal
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── video/          # Domínio Video
│   │       │   │   ├── domain/     # Entities, value objects, erros de domínio
│   │       │   │   ├── application/# Use cases, commands, queries
│   │       │   │   ├── infra/      # Repository, storage, FFmpeg
│   │       │   │   └── http/       # Routes, schemas, controllers
│   │       │   ├── user/           # Domínio User
│   │       │   └── watch-session/  # Domínio WatchSession
│   │       ├── infra/              # DB, Redis, storage, Sentry
│   │       └── config/             # Env, plugins, server
│   │
│   ├── web/                        # Nuxt 3 — frontend público
│   │   ├── pages/                  # index, /[id], /login
│   │   ├── components/             # VideoPlayer, MediaCard, ProgressBar
│   │   ├── composables/            # usePlayer, useProgress, useAuth
│   │   └── stores/                 # auth, catalog
│   │
│   └── admin/                      # Nuxt 3 — frontend administrativo
│       ├── pages/                  # dashboard, /videos, /users, /jobs
│       ├── components/             # UploadForm, JobQueue, VideoTable
│       └── composables/            # useUpload, useJobs, useStats
│
├── packages/
│   ├── shared/                     # Contratos compartilhados (sem lógica)
│   │   └── src/
│   │       ├── types/              # Video, User, WatchSession
│   │       ├── dtos/               # CreateVideoDto, UpdateProgressDto
│   │       ├── enums/              # VideoStatus, UserRole
│   │       └── errors/             # VideoNotFoundError, UnauthorizedError
│   │
│   └── worker/                     # BullMQ + FFmpeg — processo independente
│       └── src/
│           ├── jobs/               # transcode, thumbnail, cleanup
│           ├── processors/         # ffmpeg, storage upload
│           └── config/             # queue, Sentry
│
├── docs/                           # Documentação técnica
│   ├── architecture.md
│   ├── folder-structure.md
│   ├── stack.md
│   └── adr/                        # Architecture Decision Records
│
├── .env.example
├── docker-compose.yml              # Dev — inclui MinIO
├── docker-compose.prod.yml         # Prod — aponta para Cloudflare R2
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Regras de dependência

```
apps/api      → packages/shared
apps/web      → packages/shared
apps/admin    → packages/shared
packages/worker → packages/shared
```

Nenhum app importa diretamente o código de outro app. A comunicação entre `api` e `worker` acontece exclusivamente via fila (BullMQ/Redis).

---

## Domínios (DDD)

Cada módulo dentro de `apps/api/src/modules/` segue a mesma estrutura de quatro camadas:

| Camada | Responsabilidade |
|---|---|
| `domain/` | Regras de negócio puras — sem framework, sem I/O |
| `application/` | Orquestração — use cases, commands, queries |
| `infra/` | Implementações concretas — banco, storage, FFmpeg |
| `http/` | Interface HTTP — rotas, validação, serialização |

Os três agregados principais são `Video`, `User` e `WatchSession`. Nenhum módulo acessa o domínio de outro diretamente — quando há necessidade de dados cruzados, os tipos vêm do `shared`.

---

## O pacote shared

Contém apenas contratos. Nenhuma lógica de negócio, nenhum utilitário genérico.

Pode entrar:
- Tipos de domínio (`Video`, `User`, `WatchSession`)
- DTOs de entrada e saída (`CreateVideoDto`, `UpdateProgressDto`)
- Enums (`VideoStatus`, `UserRole`)
- Classes de erro tipadas (`VideoNotFoundError`, `UnauthorizedError`)

Não pode entrar:
- Use cases ou serviços
- Helpers, utils, formatters
- Qualquer coisa com dependência externa

---

## O pacote worker

Processo independente — não é um módulo da API. Pode ser reiniciado, escalado ou deployado separadamente sem afetar o processo principal.

Responsabilidades:
- Consumir jobs da fila BullMQ
- Executar transcodificação com FFmpeg
- Fazer upload dos segmentos HLS para o storage
- Reportar falhas ao Sentry

---

## Ambientes

| Arquivo | Ambiente | Storage |
|---|---|---|
| `docker-compose.yml` | Desenvolvimento | MinIO (local) |
| `docker-compose.prod.yml` | Produção | Cloudflare R2 (via env vars) |

A troca entre MinIO e R2 é feita exclusivamente por variáveis de ambiente (`STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`). Nenhuma linha de código muda entre os ambientes.