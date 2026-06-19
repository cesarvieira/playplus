# ADR-001: Bootstrap monorepo v0

**Data:** 2026-06-18  
**Status:** Aceito

## Contexto

Repositório greenfield — sem `apps/` ou `packages/` implementados. O vertical slice v0 exige subir api, worker, admin, web e infra Docker de forma coerente com DDD e regras de dependência documentadas.

## Decisão

Bootstrap com **pnpm workspaces + Turborepo**:

```
playplus/
├── apps/api/          # Fastify + TypeScript
├── apps/web/          # Nuxt 3
├── apps/admin/        # Nuxt 3
├── packages/shared/   # contratos only
├── packages/worker/   # BullMQ + FFmpeg (processo separado)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

**Docker Compose dev** (`docker-compose.yml`):

| Serviço | Imagem / build | Porta host |
|---------|----------------|------------|
| `postgres` | postgres:16-alpine | 5432 |
| `valkey` | valkey:8-alpine | 6379 |
| `minio` | minio/minio | 9000 (API), 9001 (console) |
| `nginx` | nginx:alpine | 8080 (HLS proxy) |
| `api` | build `apps/api` | 3000 |
| `worker` | build `packages/worker` | — |

`apps/web` e `apps/admin` rodam **fora do Compose** em dev (hot reload Nuxt), apontando para `api` em localhost.

**Scripts turbo v0:**

- `dev` — api + worker + web + admin em paralelo
- `build` — build de todos os packages
- `lint` / `typecheck` — por package

## Alternativas consideradas

- **Nx em vez de Turborepo:** mais pesado para projeto solo — rejeitado
- **Worker como processo dentro da API:** viola separação FFmpeg/event loop — rejeitado
- **Web/admin dentro do Compose:** perde HMR do Nuxt — rejeitado para dev

## Consequências

- **Positivas:** alinhado a `docs/folder-structure.md`; deploy independente do worker; dev rápido nos frontends
- **Negativas:** mais serviços para subir manualmente; documentar ordem de boot (infra → api/worker → frontends)

## Impacto Play+

- **Agregado(s):** User, Video (infra transversal)
- **Superfície(s):** todos os apps/packages + Docker
- **Contratos:** não
- **Breaking change:** não

## Revisão em

Após MVP v0 funcional — avaliar unificar web/admin no Compose para ambiente de demo
