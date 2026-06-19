# US-VID-007 — Painel admin de vídeos com status em tempo real

**Como** Admin/Dono  
**Quero** ver todos os vídeos e acompanhar status de transcodificação na interface admin  
**Para** saber quais estão prontos, processando ou com erro

**Pilar:** Experiências simples  
**Agregado(s):** Video  
**Superfície:** `apps/admin`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério #2; Strategy Agent — feedback de transcode

## Critérios de Aceite

- [ ] Dado que estou logado como admin, quando acesso listagem de vídeos, então vejo tabela/cards com `title`, `status`, `created_at` e indicador visual por status (`pending`, `queued`, `processing`, `ready`, `error`)
- [ ] Dado vídeo em transcode, quando recebo evento WebSocket `video.status`, então a linha do vídeo atualiza status e barra/percentual de progresso sem reload
- [ ] Dado evento `video.error`, quando recebo na listagem, então vejo status `error`, mensagem/`reason` legível e ação **Tentar de novo** (`POST /videos/:id/transcode`)
- [ ] Dado vídeo com `status: ready`, quando visualizo na listagem, então indicador confirma disponível para reprodução na web e ação **Assistir** abre o `apps/web` em nova aba
- [ ] Dado listagem carregada, quando verifico rede, então não há polling periódico de status — atualizações via WebSocket apenas
- [ ] Dado upload concluído em US-VID-002, quando redireciono ou atualizo listagem, então novo vídeo aparece com status coerente
- [ ] Dado vídeo `pending` com upload concluído e transcode ainda não disparado, quando visualizo na listagem, então vejo copy **Pronto para transcodificar** e ação **Iniciar transcodificação** (distinto de **Aguardando upload…** para `pending` sem arquivo — usar campo `upload_complete` de `GET /videos`)
- [ ] Dado clique em **Iniciar transcodificação** ou **Tentar de novo**, quando job já enfileirado, então vejo feedback de `409 JOB_ALREADY_QUEUED` (botão desabilitado ou mensagem tipada)
- [ ] Dado catálogo vazio, quando não há vídeos, então vejo estado vazio com CTA **Adicionar vídeo**
- [ ] Dado carga inicial, quando `GET /videos` está em andamento, então vejo skeleton/loading na listagem
- [ ] Dado falha de rede em `GET /videos`, quando listagem não carrega, então vejo mensagem de erro com ação **Tentar novamente**
- [ ] Dado `meta.total > limit`, quando há mais vídeos que a página atual, então vejo paginação ou controle para carregar próxima página
- [ ] Dado WebSocket desconectado, quando perco conexão durante transcode, então vejo banner **Reconectando…** e, ao reconectar, listagem é recarregada uma vez para resync
- [ ] Dado filtro **Em andamento**, quando aplico, então vejo vídeos com `status: queued` ou `processing` (filtro client-side no v0)
- [ ] Dado filtro **Pronto** ou **Erro**, quando aplico, então chamo `GET /videos?status=ready` ou `?status=error` conforme `docs/api.md`
- [ ] Dado ação **Excluir** na linha, quando confirmo exclusão, então modal de confirmação exige confirmação explícita antes de `DELETE /videos/:id`

## Requisitos Não-Funcionais

- Performance: atualização de progresso na UI em ≤ 1 s após evento WS
- Segurança: listagem acessível apenas com sessão admin
- Acessibilidade: status não depende só de cor — incluir texto ou ícone com label ("Processando 47%"); barra de progresso com `role="progressbar"`, `aria-valuenow`/`aria-valuemax` e `aria-valuetext`; região `aria-live="polite"` para mudanças de status via WS; botões ícone com `aria-label`; filtros pill com `aria-pressed`; respeitar `prefers-reduced-motion` em spinners

## Dependências

- US-USR-002 (login admin)
- US-VID-006 (API listagem — inclui `upload_complete` em itens `pending`)
- US-VID-005 (WebSocket status)
- US-VID-002 (upload manual — transcode não dispara automaticamente)

## Riscos

- Reconexão WebSocket após queda — v0 recarrega listagem uma vez ao reconectar; resync incremental é polish

## Notas de UX

### Mapa de copy por status

| Status | Badge | Copy secundária | Ação |
|--------|-------|-----------------|------|
| `pending` (`upload_complete: false`) | Pendente | Aguardando upload… | — |
| `pending` (`upload_complete: true`) | Pendente | Pronto para transcodificar | Iniciar transcodificação |
| `queued` | Na fila | Aguardando worker… | — |
| `processing` | Processando | Transcodificando… + barra % | — |
| `ready` | Pronto | Disponível na web | Assistir |
| `error` | Erro | mensagem humanizada | Tentar de novo |

### Mapeamento `video.error.reason` → copy

| `reason` (API) | Copy na UI |
|----------------|------------|
| `ffmpeg_exit_code_1` | Falha na transcodificação. O arquivo pode estar corrompido ou em formato não suportado. |
| *(outros v0)* | Falha na transcodificação após 3 tentativas. |
| *(fallback)* | Falha na transcodificação. Código: `{reason}` |

### Filtros v0

| Pill | Comportamento |
|------|---------------|
| Todos | `GET /videos` sem filtro de status |
| Pronto | `GET /videos?status=ready` |
| Em andamento | client-side: `queued` + `processing` |
| Erro | `GET /videos?status=error` |

Busca por título: fora de escopo v0 (polish).

### Componentes e composables

- `VideoTable` — listagem com status, progresso e ações
- `useJobs` ou `useVideoStatusWs` — subscribe WS na montagem, merge por `video_id`
- `useAuth` — token em memória para `?token=` no WebSocket

Mockup de referência: `apps/admin/mockups/dc.html` (seção 02 · Listagem).
