# Vertical Slice v0 — User Stories

> **Origem:** Problem Statement v0 (Discovery) → Business Case aprovado **go** (Strategy Agent)  
> **Escopo:** upload admin → transcode HLS assíncrono → reprodução web  
> **Fora de escopo v0:** gestão de outros viewers, busca/tags, séries/episódios, thumbnails automáticos, deploy prod (R2/CDN), Sentry completo, WatchSession (retomada)

## Resumo

| Métrica | Valor |
|---------|-------|
| **Total de US** | 14 |
| **Agregados** | User, Video (+ infra cross-cutting) |
| **Superfícies** | `apps/api`, `apps/admin`, `apps/web`, `packages/worker`, `packages/shared`, Docker |
| **Defer v0.1** | WatchSession (`US-WS-001`) |

## Ordem sugerida de implementação

```
PLAY-US-001  Infra Docker (postgres, valkey, minio)
PLAY-US-002  Contratos packages/shared
US-USR-001   API auth JWT
US-VID-001   POST /videos presigned + POST /videos/:id/upload-url
US-VID-003   POST /videos/:id/transcode
US-VID-004   Worker FFmpeg HLS
US-VID-005   WebSocket video.status / video.error
US-VID-006   GET /videos, GET /videos/:id
US-USR-002   Login admin
US-USR-003   Login web
US-VID-002   Upload presigned (admin UI)
US-VID-007   Listagem admin + status WS
US-VID-008   Catálogo web
US-VID-009   Player HLS web
```

## Índice de User Stories

### Infra / cross-cutting

| ID | Título | Arquivo |
|----|--------|---------|
| PLAY-US-001 | Ambiente de desenvolvimento local | [PLAY-US-001.md](./PLAY-US-001.md) |
| PLAY-US-002 | Contratos compartilhados em packages/shared | [PLAY-US-002.md](./PLAY-US-002.md) |

### User

| ID | Título | Arquivo |
|----|--------|---------|
| US-USR-001 | API de autenticação JWT com refresh rotation | [US-USR-001.md](./US-USR-001.md) |
| US-USR-002 | Login administrativo | [US-USR-002.md](./US-USR-002.md) |
| US-USR-003 | Login viewer na web | [US-USR-003.md](./US-USR-003.md) |

### Video

| ID | Título | Arquivo |
|----|--------|---------|
| US-VID-001 | Registrar vídeo e gerar URL presigned | [US-VID-001.md](./US-VID-001.md) |
| US-VID-002 | Upload de arquivo via URL presigned no admin | [US-VID-002.md](./US-VID-002.md) |
| US-VID-003 | Enfileirar job de transcodificação HLS | [US-VID-003.md](./US-VID-003.md) |
| US-VID-004 | Worker transcodifica vídeo para HLS | [US-VID-004.md](./US-VID-004.md) |
| US-VID-005 | Status de transcodificação via WebSocket | [US-VID-005.md](./US-VID-005.md) |
| US-VID-006 | Listar e consultar metadados de vídeo | [US-VID-006.md](./US-VID-006.md) |
| US-VID-007 | Painel admin de vídeos com status em tempo real | [US-VID-007.md](./US-VID-007.md) |
| US-VID-008 | Catálogo de vídeos prontos na web | [US-VID-008.md](./US-VID-008.md) |
| US-VID-009 | Reproduzir vídeo HLS no player web | [US-VID-009.md](./US-VID-009.md) |

### Defer v0.1

| ID | Título | Nota |
|----|--------|------|
| US-WS-001 | Retomar reprodução de onde parei | Ver [US-WS-001-defer.md](./US-WS-001-defer.md) |

## Próximo passo

Handoff para **`ux-agent`** (US com `apps/admin` e `apps/web`) e **`architect-agent`** (bootstrap monorepo, módulo Video DDD, pipeline cross-app) → depois **`planning-agent`**.
