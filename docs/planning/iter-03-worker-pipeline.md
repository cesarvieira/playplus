# Iteração 03 — Worker + WebSocket

> **US:** US-VID-004, US-VID-005  
> **Pré-requisito:** iter-02b (transcode enqueue)  
> **Meta:** FFmpeg gera HLS; eventos `video.status` / `video.error` via WS  
> **Capacidade:** 8 pts

---

## Tasks técnicas

| Task | Descrição | Est. | Dep. | Superfície |
|------|-----------|------|------|------------|
| **T18** | `docker-compose`: serviço nginx (ADR-003) + config proxy `/media/` → MinIO + CORS | 2 | T03 | infra |
| **T19** | `packages/worker` scaffold: BullMQ consumer, postgres, storage, env | 2 | T01 | worker |
| **T20** | **Spike FFmpeg** (timebox 2 pts): ladder 720p single + 4s segments; documentar args | 2 | T19 | worker |
| **T21** | Job `video.transcode`: download original → FFmpeg → upload HLS → update DB `ready` | 5 | T20 | worker |
| **T22** | Worker pub/sub publish `playplus:events:video` (ADR-002) | 2 | T21 | worker |
| **T23** | API WS handler `/v1/ws?token=` + subscribe pub/sub + fan-out | 5 | T09, T22 | api |
| **T24** | Teste E2E manual: transcode job → WS progress → status ready + stream_url nginx | 2 | T18, T23 | — |

### Ordem de execução

```
T18 (paralelo) ─────────────────────────┐
T19 → T20 → T21 → T22 → T23 → T24 ────┘
```

### Pontuação total: 20 pts → **2 iterações**

| Bloco | Tasks | pts |
|-------|-------|-----|
| 03a | T18 + T19 + T20 + T21 (FFmpeg 720p only v0) | 11 → reduzir T21 para 5, total 9 |
| 03b | T22 + T23 + T24 | 9 |

### Riscos

- FFmpeg CPU na máquina dev — concurrency 1
- Ladder completo 240p–1080p: expandir após spike T20 validar

### Próximo passo

[iter-04-admin-ui.md](./iter-04-admin-ui.md)
