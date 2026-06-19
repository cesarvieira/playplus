# US-VID-009 — Reproduzir vídeo HLS no player web

**Como** Viewer registrado  
**Quero** assistir um vídeo em streaming HLS adaptativo  
**Para** consumir conteúdo do meu catálogo privado com qualidade adequada à conexão

**Pilar:** Experiências simples  
**Agregado(s):** Video  
**Superfície:** `apps/web`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério #3 e #4; `.cursorrules` player HLS

## Critérios de Aceite

- [ ] Dado vídeo com `status: ready`, quando abro página de reprodução, então player carrega `stream_url` (`master.m3u8`) via `hls.js` ou `@nuxtjs/video-player` e inicia playback
- [ ] Dado vídeo com `status: processing` ou `pending`, quando tento reproduzir, então vejo mensagem clara ("Vídeo ainda processando") e API retorna `409 VIDEO_NOT_READY` se detalhe for consultado
- [ ] Dado stream HLS válido em dev (MinIO/nginx), quando reproduzo, então consigo play, pause, seek e alternar qualidade quando múltiplas rendições existem
- [ ] Dado falha de carregamento de segmento, quando rede falha, então player exibe erro recuperável (retry ou mensagem ao usuário)
- [ ] Dado vídeo inexistente, quando acesso `/[id]` inválido, então vejo página de erro 404 amigável
- [ ] Dado v0 sem WatchSession, quando reproduzo do início, então player inicia em 0:00 — retomada automática fica fora de escopo

## Requisitos Não-Funcionais

- Performance: time-to-first-frame ≤ 5 s em dev local para vídeo de teste transcodificado
- Segurança: `stream_url` servida sem expor credenciais de storage; playback requer sessão autenticada na app (API protegida)
- Acessibilidade: controles nativos ou custom com labels; foco visível; player operável por teclado (play/pause, seek básico)

## Dependências

- US-USR-003 (login web)
- US-VID-006 (GET /videos/:id com `stream_url`)
- US-VID-004 (HLS gerado e publicado)

## Riscos

- CORS MinIO → browser pode bloquear segmentos — mitigar config CORS no bucket ou proxy nginx em dev (decisão `architect-agent`)
- Safari com HLS nativo vs hls.js — testar pelo menos Chrome + um browser com HLS nativo
