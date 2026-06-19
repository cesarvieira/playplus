# US-VID-001 — Registrar vídeo e gerar URL presigned

**Como** Admin/Dono  
**Quero** registrar metadados de um vídeo e receber URL presigned para upload  
**Para** iniciar o fluxo de ingestão sem enviar bytes pela API

**Pilar:** Histórias organizadas  
**Agregado(s):** Video  
**Superfície:** `apps/api`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — upload admin; `docs/api.md` `POST /videos`

## Critérios de Aceite

- [ ] Dado que estou autenticado como admin, quando chamo `POST /videos` com `{ title, file_name, file_size }`, então recebo `201` com `{ id, upload_url, status: "pending" }`
- [ ] Dado request sem token ou com role viewer, quando chamo `POST /videos`, então recebo `401 UNAUTHORIZED` ou `403 FORBIDDEN`
- [ ] Dado body inválido (campos ausentes ou `file_size` ≤ 0), quando chamo `POST /videos`, então recebo `422 VALIDATION_ERROR`
- [ ] Dado registro criado, quando inspeciono storage, então a `upload_url` aponta para MinIO com TTL limitado e permite PUT/POST do arquivo original
- [ ] Dado registro criado, quando consulto banco, então vídeo persiste com `status: pending` e metadados informados
- [ ] Dado vídeo existente com `status: pending`, quando admin chama `POST /videos/:id/upload-url`, então recebo `200` com nova `upload_url` para o mesmo `id` — sem criar registro duplicado
- [ ] Dado vídeo com status diferente de `pending`, quando chamo `POST /videos/:id/upload-url`, então recebo `409` (upload já concluído ou transcode em andamento)

## Requisitos Não-Funcionais

- Performance: resposta da API em ≤ 300 ms — geração de presigned não bloqueia
- Segurança: rota admin 🔒; URL presigned expira (TTL configurável, ex.: 1 h); API nunca recebe binário do vídeo
- Acessibilidade: n/a (API)

## Dependências

- PLAY-US-001 (MinIO)
- PLAY-US-002 (CreateVideoDto, VideoStatus)
- US-USR-001 (auth admin)

## Riscos

- `file_size` informado pelo cliente pode divergir do arquivo real — v0 aceita confiança do admin; validação pós-upload fica fora de escopo
