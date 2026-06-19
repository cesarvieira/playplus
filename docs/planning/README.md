# Planejamento — Play+ v0

> **Entrada:** US v0 + [architecture.md](../architecture.md) + ADRs 001–005  
> **Saída:** tasks ordenadas → handoff `dev-agent`

## Roadmap de iterações

| Iter | Foco | US | pts alvo | Status |
|------|------|-----|----------|--------|
| [01](./iter-01-foundation.md) | Monorepo + infra + shared + auth API | PLAY-US-001, PLAY-US-002, US-USR-001 | 8 | **próxima** |
| [02](./iter-02-video-backend.md) | Video API (presigned, transcode enqueue, list/get) | US-VID-001, US-VID-003, US-VID-006 | 8 | backlog |
| [03](./iter-03-worker-pipeline.md) | Worker FFmpeg + WS pub/sub | US-VID-004, US-VID-005 | 8 | backlog |
| [04](./iter-04-admin-ui.md) | Login admin + upload + listagem WS | US-USR-002, US-VID-002, US-VID-007 | 8 | backlog |
| [05](./iter-05-web-ui.md) | Login web + catálogo + player | US-USR-003, US-VID-008, US-VID-009 | 8 | backlog |

**Capacidade referência:** 5–8 pts/iteração (MVP greenfield + aprendizado).

## Ordem canônica de implementação

```
shared → api (domain → application → infra → http) → migration → worker → admin → web
```

## Handoff dev-agent

Implementar tasks na ordem numérica de cada iteração. Commits: Conventional Commits em português (`.cursorrules`).
