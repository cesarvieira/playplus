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
- [ ] Dado evento `video.error`, quando recebo na listagem, então vejo status `error` e mensagem/`reason` legível
- [ ] Dado vídeo com `status: ready`, quando visualizo na listagem, então indicador confirma disponível para reprodução na web
- [ ] Dado listagem carregada, quando verifico rede, então não há polling periódico de status — atualizações via WebSocket apenas
- [ ] Dado upload concluído em US-VID-002, quando redireciono ou atualizo listagem, então novo vídeo aparece com status coerente

## Requisitos Não-Funcionais

- Performance: atualização de progresso na UI em ≤ 1 s após evento WS
- Segurança: listagem acessível apenas com sessão admin
- Acessibilidade: status não depende só de cor — incluir texto ou ícone com label ("Processando 47%")

## Dependências

- US-USR-002 (login admin)
- US-VID-006 (API listagem)
- US-VID-005 (WebSocket status)

## Riscos

- Reconexão WebSocket após queda — v0 pode recarregar listagem uma vez ao reconectar; resync completo é polish
