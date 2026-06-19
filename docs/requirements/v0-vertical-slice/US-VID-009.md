# US-VID-009 — Reproduzir vídeo HLS no player web

**Como** Viewer registrado  
**Quero** assistir um vídeo em streaming HLS adaptativo  
**Para** consumir conteúdo do meu catálogo privado com qualidade adequada à conexão

**Pilar:** Experiências simples  
**Agregado(s):** Video  
**Superfície:** `apps/web`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério #3 e #4; `.cursorrules` player HLS

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/[id]` | `pages/[id].vue` | Detalhe e reprodução HLS (entrada via catálogo US-VID-008 ou deep link) |

## Critérios de Aceite

- [ ] Dado vídeo com `status: ready`, quando abro `/[id]`, então `GET /videos/:id` retorna metadados com `stream_url` (`master.m3u8`), o player carrega o manifest via `hls.js` ou `@nuxtjs/video-player` e fica **pronto para reprodução** — playback inicia somente após ação explícita do usuário (sem autoplay com som)
- [ ] Dado vídeo com `status: processing` ou `pending`, quando abro `/[id]` (deep link ou link do admin), então vejo mensagem *"Este vídeo ainda está sendo preparado."*, player HLS **não** é montado e API retorna `409 VIDEO_NOT_READY`
- [ ] Dado vídeo com `status: queued`, quando abro `/[id]`, então vejo mensagem *"Este vídeo está na fila de processamento."* e ação **Voltar aos vídeos**
- [ ] Dado vídeo com `status: error`, quando abro `/[id]`, então vejo mensagem *"Este vídeo não está disponível para reprodução."* e ação **Voltar aos vídeos**
- [ ] Dado stream HLS válido em dev (MinIO/nginx), quando reproduzo, então consigo play, pause e seek; ABR adaptativo seleciona qualidade automaticamente; menu manual de rendição (240p–1080p) é opcional no v0
- [ ] Dado buffering HLS, quando segmentos estão carregando, então vejo indicador de carregamento no player (sem layout shift)
- [ ] Dado falha de carregamento de segmento, quando rede falha, então player exibe erro recuperável com ação **Tentar novamente**
- [ ] Dado vídeo inexistente, quando acesso `/[id]` inválido, então vejo página de erro 404 com mensagem *"Vídeo não encontrado."* e ação **Voltar aos vídeos**
- [ ] Dado carga inicial, quando `GET /videos/:id` está em andamento, então vejo skeleton no stage do player e área de título (sem tela branca)
- [ ] Dado falha de rede em `GET /videos/:id`, quando metadados não carregam, então vejo mensagem de erro com ação **Tentar novamente**
- [ ] Dado header da página, quando visualizo `/[id]`, então vejo link **Voltar aos vídeos** para retornar ao catálogo (`/`)
- [ ] Dado metadados carregados, quando visualizo abaixo do player, então vejo `title`, duração formatada (`duration`) e `created_at` formatado — campos do contrato `GET /videos/:id`
- [ ] Dado `thumbnail_url` presente, quando player está pausado antes do play, então thumbnail pode ser usada como poster do stage
- [ ] Dado viewport estreita (mobile ou notebook 13"), quando visualizo player, então stage mantém `aspect-ratio` 16:9, controles permanecem acessíveis e header empilha sem overflow horizontal
- [ ] Dado v0 sem WatchSession, quando reproduzo do início, então player inicia em 0:00 — retomada automática fica fora de escopo

## Copy de UI

| Situação | Mensagem | Ação |
|----------|----------|------|
| Loading metadados | — (skeleton) | — |
| Buffering HLS | — (indicador no player) | — |
| `processing` / `pending` | Este vídeo ainda está sendo preparado. | Voltar aos vídeos |
| `queued` | Este vídeo está na fila de processamento. | Voltar aos vídeos |
| `error` | Este vídeo não está disponível para reprodução. | Voltar aos vídeos |
| `404 VIDEO_NOT_FOUND` | Vídeo não encontrado. | Voltar aos vídeos |
| Falha de segmento/rede (HLS) | Não foi possível carregar o vídeo. | Tentar novamente |
| Erro genérico API | Não foi possível carregar os detalhes do vídeo. | Tentar novamente |
| Navegação | Voltar aos vídeos | link para `/` |

## Requisitos Não-Funcionais

- Performance: time-to-first-frame ≤ 5 s em dev local para vídeo de teste transcodificado (após gesto de play)
- Segurança: `stream_url` servida sem expor credenciais de storage; metadados exigem sessão autenticada (`GET /videos/:id` protegido)
- Acessibilidade (WCAG 2.1 AA): controles com `aria-label` descritivo ("Reproduzir", "Pausar", "Avançar 10 segundos", etc.); scrubber com `role="slider"`, `aria-valuemin`/`aria-valuemax`/`aria-valuenow`/`aria-valuetext`; foco visível nos controles; player operável por teclado (play/pause, seek básico); mensagens de erro em `role="alert"` ou `aria-live="assertive"`; contraste mínimo 4.5:1 em overlays; respeitar `prefers-reduced-motion` em spinners de buffering; sem autoplay com som (WCAG 1.4.2)
- Responsividade: player 16:9 responsivo; controles utilizáveis em viewport estreita

## Fora de escopo v0

- Retomada automática de `progress.position` (defer US-WS-001)
- Envio de `player.progress` via WebSocket
- Menu manual de qualidade (nice-to-have — ABR automático é obrigatório)
- Velocidade de reprodução (1x, 1.5x, etc.)
- Legendas / closed captions
- Picture-in-picture

## Dependências

- US-USR-003 (login web)
- US-VID-006 (GET /videos/:id com `stream_url` e `409 VIDEO_NOT_READY`)
- US-VID-004 (HLS gerado e publicado)
- US-VID-008 (catálogo e rota `/[id]`)

## Riscos

- CORS MinIO → browser pode bloquear segmentos — mitigar config CORS no bucket ou proxy nginx em dev (decisão `architect-agent`)
- Safari com HLS nativo vs hls.js — testar pelo menos Chrome + um browser com HLS nativo

## Notas de UX

### Componentes e composables

| Artefato | Responsabilidade |
|----------|------------------|
| `pages/[id].vue` | Fetch de metadados, estados da página, layout, link Voltar |
| `VideoPlayer` | HLS, controles, buffering, seek, poster, erro recuperável |
| `usePlayer` | Instância hls.js / detecção Safari nativo, retry de segmento |
| `useAuth` | Bearer em `GET /videos/:id`; redirect em `401` |
| `middleware/auth` | Guard de rota `/[id]` |

### Estados da página

| Estado | UI |
|--------|-----|
| `loading` | Skeleton no stage + título |
| `ready` (pausado) | Poster/thumbnail, botão play central, controles visíveis |
| `playing` | Vídeo ativo, controles sobre overlay |
| `buffering` | Indicador sobre o stage durante carga de segmentos |
| `unavailable` | Mensagem por status (`processing`, `queued`, `error`) + Voltar |
| `not_found` | 404 amigável + Voltar |
| `error` (API ou HLS) | Mensagem tipada + Tentar novamente ou Voltar |

### Qualidade HLS (v0)

- **Obrigatório:** ABR adaptativo via `master.m3u8` — player ajusta rendição conforme banda
- **Opcional:** menu manual listando rendições disponíveis (240p, 480p, 720p, 1080p); se não implementado, badge informativo da qualidade atual (somente leitura, sem prometer controle)

### Metadados exibidos

- `title` — destaque abaixo do player
- `duration` — formatada (ex.: `12:04`) na linha secundária
- `created_at` — formatada (ex.: `Adicionado em 28 mai 2026`)
- `thumbnail_url` — poster opcional no stage antes do play
- **Não exibir** campos fora do contrato (ex.: `file_size`)

Mockup de referência: `apps/web/mockups/dc.html` (seção **03 · Player**).
