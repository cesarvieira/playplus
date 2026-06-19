# US-WS-001 — Retomar reprodução de onde parei *(defer v0.1)*

> **Status:** Fora do escopo do vertical slice v0. Documentada para rastreabilidade e planejamento da próxima iteração.

**Como** Viewer registrado  
**Quero** retomar automaticamente do último ponto salvo ao abrir um vídeo  
**Para** continuar filmes e séries sem procurar manualmente o minuto certo

**Pilar:** Experiências simples  
**Agregado(s):** WatchSession  
**Superfície:** `apps/web`, `apps/api`, `packages/shared`  
**Rastreabilidade:** Strategy Agent — defer explícito; visão produto em `.cursorrules`

## Critérios de Aceite (v0.1)

- [ ] Dado que assisti um vídeo com `status: ready` e parei aos 12:34, quando abro o mesmo vídeo novamente, então o player inicia em 12:34 (±5 s)
- [ ] Dado reprodução ativa, quando passam ~10 s de playback, então progresso é enviado via WebSocket `player.progress` e persistido em `watch_progress`
- [ ] Dado `GET /videos/:id`, quando existe progresso salvo, então resposta inclui `{ progress: { position, updated_at } }`

## Requisitos Não-Funcionais

- Performance: upsert de progresso não bloqueia UI do player
- Segurança: progresso associado ao usuário autenticado
- Acessibilidade: indicador "Continuar de onde parou" legível em mobile

## Dependências

- US-VID-009 (player funcional)
- US-USR-003 (login viewer)

## Motivo do defer

O v0 valida ciclo **subir → transcodificar → assistir**. Retomada exige agregado WatchSession, WebSocket bidirecional `player.progress` e UX de seek inicial — valor alto, mas não bloqueia validação de stack nem utilidade mínima definida no Business Case.
