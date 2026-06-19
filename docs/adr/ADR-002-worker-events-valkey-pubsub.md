# ADR-002: Eventos worker→API via Valkey pub/sub

**Data:** 2026-06-18  
**Status:** Aceito

## Contexto

US-VID-005 exige WebSocket `video.status` / `video.error` em tempo real. O worker roda em processo separado (`packages/worker`) e não pode importar código da API. A comunicação api↔worker é **somente via fila** — mas eventos WS precisam chegar ao cliente admin sem polling.

## Decisão

Worker **publica eventos** no Valkey (Redis-compatible) via **pub/sub**. API **subscreve** o canal e faz fan-out para clientes WebSocket conectados.

**Canal:** `playplus:events:video`

**Payload (JSON):**

```json
{
  "type": "video.status",
  "payload": {
    "video_id": "uuid",
    "job_id": "uuid",
    "status": "processing",
    "progress": 47
  }
}
```

ou `{ "type": "video.error", "payload": { ... } }`

**Responsabilidades:**

| Processo | Ação |
|----------|------|
| Worker | Atualiza `videos.status` no PostgreSQL; publica evento no pub/sub |
| API (WS handler) | Subscribe canal; broadcast para conexões autenticadas admin |
| API (REST) | Fonte de verdade persistida — WS é notificação, não storage |

Progresso FFmpeg: worker emite a cada ≤ 5 s durante `processing`.

## Alternativas consideradas

- **HTTP callback worker→api:** acopla worker à API, exige URL interna, retry manual — rejeitado
- **Cliente faz polling GET /videos:** anti-pattern documentado — rejeitado
- **BullMQ events only (sem pub/sub):** BullMQ notifica progresso de job, mas WS precisa sair da API; possível, porém pub/sub desacopla melhor múltiplos subscribers futuros — pub/sub preferido
- **WebSocket direto worker→cliente:** worker não deve expor porta ao browser — rejeitado

## Consequências

- **Positivas:** desacoplamento; reutiliza Valkey já presente; sem nova infra
- **Negativas:** pub/sub não persiste mensagens — cliente que reconecta deve resync via `GET /videos` (US-VID-007); ordem de eventos não garantida (aceitável para progresso)

## Impacto Play+

- **Agregado(s):** Video
- **Superfície(s):** `apps/api`, `packages/worker`
- **Contratos:** sim — eventos WS já em `docs/api.md`
- **Breaking change:** não

## Revisão em

Após v0.1 — se múltiplas instâncias de API, avaliar Redis Streams ou BullMQ como bus único
