# US-VID-003 — Enfileirar job de transcodificação HLS

**Como** Admin/Dono  
**Quero** disparar transcodificação após upload concluído  
**Para** converter o arquivo original em stream HLS de forma assíncrona

**Pilar:** Aprendizado contínuo  
**Agregado(s):** Video  
**Superfície:** `apps/api`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — transcode assíncrono; `docs/api.md` `POST /videos/:id/transcode`

## Critérios de Aceite

- [ ] Dado vídeo com upload concluído e `status: pending`, quando admin chama `POST /videos/:id/transcode`, então recebo `202` com `{ job_id, status: "queued" }`
- [ ] Dado transcode solicitado, quando a rota responde, então a resposta HTTP retorna imediatamente — sem aguardar FFmpeg
- [ ] Dado job enfileirado, quando inspeciono BullMQ, então existe job com `video_id` e metadados necessários para o worker
- [ ] Dado transcode já enfileirado para o mesmo vídeo, quando chamo novamente, então recebo `409 JOB_ALREADY_QUEUED`
- [ ] Dado vídeo inexistente, quando chamo transcode, então recebo `404 VIDEO_NOT_FOUND`
- [ ] Dado request sem role admin, quando chamo transcode, então recebo `401` ou `403`
- [ ] Dado job enfileirado, quando status é atualizado, então vídeo passa para `queued` ou `processing` conforme transição documentada

## Requisitos Não-Funcionais

- Performance: enfileiramento ≤ 200 ms — operação leve (DB + Redis)
- Segurança: rota admin 🔒; job payload não expõe credenciais de storage
- Acessibilidade: n/a (API)

## Dependências

- US-VID-001 (registro de vídeo)
- PLAY-US-001 (valkey/BullMQ)
- US-USR-001 (auth admin)

## Riscos

- Idempotência: reprocessamento acidental pode duplicar jobs — mitigar checagem `JOB_ALREADY_QUEUED` e lock por `video_id`
