# Iteração 02 — Video backend (REST)

> **US:** US-VID-001, US-VID-003, US-VID-006  
> **Pré-requisito:** iter-01b (auth completa)  
> **Meta:** criar vídeo + presigned URL + enfileirar transcode + listar/detalhar  
> **Capacidade:** 8 pts (+ carryover)

---

## Tasks técnicas

| Task | Descrição | Est. | Dep. | Superfície |
|------|-----------|------|------|------------|
| **T11** | Migration `videos` (schema architecture.md + `upload_complete`) | 2 | T10 | api |
| **T12** | `video/domain`: entity, transições `VideoStatus`, erros `VideoNotFound`, `JobAlreadyQueued` | 2 | T02 | api |
| **T13** | `video/infra`: `StorageClient` presigned PUT + HEAD (MinIO SDK) | 3 | T03 | api |
| **T14** | `CreateVideoUseCase` + `RenewUploadUrlUseCase` + rotas `POST /videos`, `POST /videos/:id/upload-url` | 3 | T11–T13 | api |
| **T15** | `TranscodeQueue` BullMQ producer + `EnqueueTranscodeUseCase` + rota `POST /videos/:id/transcode` (idempotência ADR-005) | 5 | T14 | api |
| **T16** | `ListVideosQuery` + `GetVideoQuery` (lazy HEAD `upload_complete`) + rotas `GET /videos`, `GET /videos/:id` | 3 | T11, T13 | api |
| **T17** | Teste manual: curl create → presigned PUT → transcode enqueue → list | 2 | T15, T16 | — |

### Ordem de execução

```
T11 → T12 → T13 → T14 → T15
              └────────→ T16 (paralelo após T13)
T15 + T16 → T17
```

### Pontuação total: 20 pts

### Escopo 8 pts (iter 02)

| Tasks | pts |
|-------|-----|
| T11 + T12 + T13 | 7 |
| T14 (parcial — só POST /videos) | 3 → **carryover** |

**Entrega mínima 8 pts:** migration videos + domain + storage client + POST /videos presigned.

**Carryover iter 02b:** T14 upload-url, T15 transcode, T16 list/get, T17 testes.

### Próximo passo

iter-03 worker + WS após transcode enqueue funcional.
