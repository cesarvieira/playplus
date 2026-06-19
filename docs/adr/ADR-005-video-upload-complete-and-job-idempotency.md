# ADR-005: upload_complete e idempotência de transcode

**Data:** 2026-06-18  
**Status:** Aceito

## Contexto

US-VID-007 distingue vídeo `pending` aguardando upload vs pronto para transcodificar. `docs/api.md` define campo `upload_complete` em itens `pending` do `GET /videos`. Não há endpoint dedicado de confirmação de upload. US-VID-003 exige idempotência (`JOB_ALREADY_QUEUED`).

## Decisão

### Campo `upload_complete`

Coluna booleana `upload_complete` na tabela `videos`, default `false`.

**Materialização lazy (v0):**

1. Em `GET /videos` (e opcionalmente `GET /videos/:id`), para cada vídeo com `status: pending` e `upload_complete = false`, a camada `application` executa **HEAD** no objeto `storage_original_key` no MinIO/R2.
2. Se objeto existe → atualiza `upload_complete = true` no banco e retorna `true` na resposta.
3. Se não existe → retorna `false`.

Aceitável no v0: catálogo pessoal com dezenas de vídeos, poucos `pending` simultâneos.

**Em `POST /videos/:id/transcode`:**

1. HEAD obrigatório no original — se ausente, `422 VALIDATION_ERROR` ("Upload não concluído").
2. Se presente, seta `upload_complete = true` antes de enfileirar.

### Idempotência BullMQ

| Regra | Valor |
|-------|-------|
| Job name | `video.transcode` |
| Job ID | `transcode:{videoId}` |
| Concurrency worker | `1` (v0) |

Se job com mesmo ID já existe em estado `waiting`/`active`/`delayed` → API retorna `409 JOB_ALREADY_QUEUED`.

Transições de status:

```
pending → queued → processing → ready
                              ↘ error
```

Worker seta `processing` ao iniciar; `ready` ou `error` ao finalizar.

### Retry transcode (US-VID-007 "Tentar de novo")

Vídeo em `error` pode chamar `POST /videos/:id/transcode` novamente se original ainda existir — API remove job ID anterior failed ou usa novo job ID com sufixo; v0: **reset status para `queued`** e re-enqueue com mesmo `jobId` após limpar job failed no BullMQ.

## Alternativas consideradas

- **`POST /videos/:id/confirm-upload`:** explícito, mas endpoint extra — defer; lazy HEAD suficiente no v0
- **Cliente seta flag localmente:** perde estado no refresh — rejeitado como única fonte
- **HEAD em toda listagem sempre:** custo linear — mitigado cacheando após primeiro true

## Consequências

- **Positivas:** sem novo endpoint; UI admin distingue estados; alinhado a `docs/api.md`
- **Negativas:** HEAD em listagem adiciona latência proporcional a pendentes — monitorar se catálogo crescer

## Impacto Play+

- **Agregado(s):** Video
- **Superfície(s):** `apps/api`, `packages/worker`, `packages/shared`
- **Contratos:** `upload_complete` já documentado; sem breaking change
- **Breaking change:** não

## Revisão em

Catálogo > 50 vídeos pendentes simultâneos — migrar para webhook/confirm-upload explícito
