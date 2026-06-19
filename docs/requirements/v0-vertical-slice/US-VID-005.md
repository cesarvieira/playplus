# US-VID-005 — Status de transcodificação via WebSocket

**Como** Admin/Dono  
**Quero** receber atualizações em tempo real do progresso de transcodificação  
**Para** saber quando o vídeo está pronto sem recarregar a página ou fazer polling

**Pilar:** Experiências simples  
**Agregado(s):** Video  
**Superfície:** `apps/api`, `packages/worker`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério #2; `docs/api.md` WebSocket `video.status` / `video.error`

## Critérios de Aceite

- [ ] Dado cliente autenticado, quando conecto em `wss://.../v1/ws?token=<access_token>`, então handshake WebSocket é aceito
- [ ] Dado job de transcode em execução, quando worker reporta progresso, então admin recebe mensagem `{ type: "video.status", payload: { video_id, job_id, status, progress } }` com `status` em `queued` | `processing` | `ready` | `error` e `progress` 0–100
- [ ] Dado transcode concluído com sucesso, quando status muda para `ready`, então evento `video.status` é emitido com `progress: 100`
- [ ] Dado falha após retries esgotados, quando job falha, então admin recebe `{ type: "video.error", payload: { video_id, job_id, reason } }`
- [ ] Dado token inválido na query, quando tento conectar WebSocket, então conexão é rejeitada
- [ ] Dado admin na listagem de vídeos, quando transcode progride, então **não** há polling HTTP de status — apenas WebSocket

## Requisitos Não-Funcionais

- Performance: eventos de progresso emitidos em intervalo ≤ 5 s durante transcode ativo
- Segurança: WebSocket autenticado via query param token; admin só recebe eventos de vídeos que pode gerenciar
- Acessibilidade: n/a (infra de eventos — UI trata em US-VID-007)

## Dependências

- US-USR-001 (JWT para WS)
- US-VID-003 (job enfileirado)
- US-VID-004 (worker emite progresso)

## Riscos

- Canal worker → api para broadcast pode exigir Redis pub/sub ou callback HTTP — decisão arquitetural para `architect-agent`
