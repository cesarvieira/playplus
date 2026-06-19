# US-VID-006 — Listar e consultar metadados de vídeo

**Como** Viewer registrado  
**Quero** listar vídeos e ver detalhes de um vídeo específico  
**Para** navegar o catálogo e obter URL de stream para reprodução

**Pilar:** Histórias organizadas  
**Agregado(s):** Video  
**Superfície:** `apps/api`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critérios #3 e #4; `docs/api.md` `GET /videos`, `GET /videos/:id`

## Critérios de Aceite

- [ ] Dado usuário autenticado, quando chamo `GET /videos?page=1&limit=20`, então recebo `{ data: [...], meta: { total, page, limit } }` com itens contendo `id`, `title`, `duration`, `thumbnail_url`, `status`, `created_at`
- [ ] Dado filtro `status=ready`, quando listo vídeos, então apenas vídeos prontos aparecem
- [ ] Dado vídeo existente com `status: ready`, quando chamo `GET /videos/:id`, então recebo metadados completos incluindo `stream_url` apontando para `master.m3u8` (MinIO/nginx em dev)
- [ ] Dado vídeo com `status: processing` ou `pending`, quando chamo `GET /videos/:id` para reprodução, então `stream_url` pode estar ausente ou rota de play deve tratar `409 VIDEO_NOT_READY` conforme contrato
- [ ] Dado vídeo inexistente, quando chamo `GET /videos/:id`, então recebo `404 VIDEO_NOT_FOUND`
- [ ] Dado request sem autenticação, quando chamo endpoints de vídeo, então recebo `401 UNAUTHORIZED`
- [ ] Dado v0 sem thumbnails automáticos, quando listo vídeos, então `thumbnail_url` pode ser `null` sem quebrar contrato

## Requisitos Não-Funcionais

- Performance: listagem paginada responde em ≤ 500 ms com até 100 vídeos no banco
- Segurança: catálogo privado — apenas usuários autenticados; `stream_url` em dev aponta para endpoint acessível sem credenciais R2
- Acessibilidade: n/a (API)

## Dependências

- US-USR-001 (auth)
- US-VID-004 (vídeos com `status: ready` e HLS publicado)
- PLAY-US-002 (tipos Video)

## Riscos

- `progress` em `GET /videos/:id` pertence a WatchSession — omitir ou retornar `null` no v0 (defer US-WS-001)
