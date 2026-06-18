# Requirements Agent — Referência Play+

Material de apoio para especificação de requisitos. Fonte de verdade completa: `.cursorrules`, `docs/api.md`, `docs/stack.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — entrada da `strategy-agent` (fase 02); saída → `ux-agent`, `architect-agent` ou `planning-agent`.

---

## Convenção de IDs

Use IDs sequenciais e rastreáveis por agregado:

| Prefixo | Agregado | Exemplo |
|---------|----------|---------|
| `US-USR-` | User | `US-USR-001` |
| `US-VID-` | Video | `US-VID-001` |
| `US-WS-` | WatchSession | `US-WS-001` |
| `PLAY-US-` | Épico cross-agregado | `PLAY-US-001` |

Prefira prefixo por agregado quando a US for localizada. Use `PLAY-US-` apenas para épicos que cruzam múltiplos agregados.

---

## Personas

Personas finais devem vir do discovery — use como referência a tabela em [discovery-agent/reference.md](../discovery-agent/reference.md):

- **Admin/Dono** — upload, catálogo, gestão de usuários (`apps/admin`)
- **Viewer registrado** — assistir, retomar, navegar (`apps/web`); conta criada pelo admin

Indique role (`viewer` / admin) na US quando relevante para critérios de aceite de auth.

---

## Checklist NFR Play+

Ao redigir requisitos não-funcionais, verifique se estes pontos se aplicam:

| Área | O que especificar |
|------|-------------------|
| **Upload** | Presigned URL direto ao MinIO/R2 — API nunca recebe binário |
| **Transcode** | Job BullMQ assíncrono — rota HTTP não bloqueia FFmpeg |
| **Status de vídeo** | WebSocket `video.status` / `video.error` — não polling |
| **Reprodução** | Só com `status: ready` — `409 VIDEO_NOT_READY` antes disso |
| **Progresso** | WebSocket `player.progress` ~10s → upsert em `watch_progress` |
| **Auth** | JWT 15min + refresh rotation 7d — access em memória, refresh em cookie httpOnly |
| **Storage prod** | CDN HLS — credenciais R2 nunca expostas ao cliente |
| **Erros** | Códigos tipados (`VIDEO_NOT_FOUND`, `UNAUTHORIZED`, etc.) |
| **Observabilidade** | Falhas críticas em api, worker e nuxt → Sentry |

---

## Mapa US → agregado/superfície

| Capacidade | Agregado | Superfícies típicas |
|------------|----------|---------------------|
| Login, logout, refresh, roles | User | `apps/api`, `apps/web`, `apps/admin`, `packages/shared` |
| Gestão de viewers registrados | User | `apps/api`, `apps/admin` |
| Upload e metadados de vídeo | Video | `apps/admin`, `apps/api`, `packages/worker`, storage |
| Transcodificação HLS | Video | `apps/api`, `packages/worker`, storage, CDN |
| Catálogo e detalhe de vídeo | Video | `apps/web`, `apps/admin`, `apps/api` |
| Player e stream HLS | Video | `apps/web`, CDN |
| Progresso e retomada | WatchSession | `apps/web`, `apps/api` (WebSocket) |

Ordem MVP sugerida: User → Video → WatchSession → polish UX.

---

## Critérios de quebra de US

Espelha a matriz de esforço da [strategy-agent/reference.md](../strategy-agent/reference.md):

| Tamanho | Critério | Ação |
|---------|----------|------|
| **Pequena** | 1 app, sem worker, sem `shared`, sem migration | Entregável em uma iteração |
| **Média** | 2 apps ou `shared` + migration; sem FFmpeg | Avaliar quebra por superfície |
| **Grande** | Pipeline HLS, worker, WebSocket, ou 3+ superfícies | **Quebrar imediatamente** em US menores |

Exemplo de quebra: "Upload completo com transcode" → US-VID-001 (presigned upload) + US-VID-002 (enfileirar transcode) + US-VID-003 (status via WS).

---

## Exemplo completo — retomada (WatchSession)

```markdown
## US-WS-001 — Retomar reprodução de onde parei

**Como** Viewer registrado
**Quero** retomar automaticamente do último ponto salvo ao abrir um vídeo
**Para** continuar a série sem procurar manualmente o minuto certo

**Pilar:** Experiências simples
**Agregado(s):** WatchSession
**Superfície:** apps/web, apps/api, packages/shared
**Rastreabilidade:** Business Case — retomada automática (Strategy Agent, go)

### Critérios de Aceite
- [ ] Dado que assisti um vídeo com `status: ready` e parei aos 12:34, quando abro o mesmo vídeo novamente, então o player inicia em 12:34 (±5s)
- [ ] Dado que estou reproduzindo, quando passam ~10s de playback, então o progresso é enviado via WebSocket `player.progress` e persistido
- [ ] Dado um vídeo com `status: processing`, quando tento reproduzir, então recebo erro `409 VIDEO_NOT_READY` e vejo mensagem clara ao viewer

### Requisitos Não-Funcionais
- Performance: upsert de progresso não deve bloquear UI do player
- Segurança: progresso associado ao usuário autenticado — viewer A não vê progresso de viewer B
- Acessibilidade: indicador visual de "continuar de onde parou" legível em mobile

### Dependências
- US-USR-001 (login viewer)
- US-VID-003 (vídeo com `status: ready` e `stream_url`)

### Riscos
- Ambiguidade: "automaticamente" — confirmar se retoma ao abrir detalhe do vídeo ou só ao clicar play
```

---

## Exemplo completo — upload (Video)

```markdown
## US-VID-001 — Enviar vídeo via upload presigned

**Como** Admin/Dono
**Quero** fazer upload de um arquivo de vídeo direto ao storage
**Para** adicionar conteúdo ao catálogo sem sobrecarregar a API

**Pilar:** Histórias organizadas
**Agregado(s):** Video
**Superfície:** apps/admin, apps/api, packages/shared
**Rastreabilidade:** PS — upload demorado sem feedback (Discovery Agent)

### Critérios de Aceite
- [ ] Dado que estou autenticado como admin, quando chamo `POST /videos` com metadados, então recebo `upload_url` presigned e registro com `status: draft`
- [ ] Dado a `upload_url`, quando envio o arquivo direto ao storage, então o upload completa sem passar bytes pela API
- [ ] Dado upload concluído, quando aciono transcode, então um job BullMQ é enfileirado (US separada — US-VID-002)

### Requisitos Não-Funcionais
- Performance: upload direto ao storage — sem limite artificial na API
- Segurança: URL presigned com TTL; rota admin exige role administrador

### Dependências
- US-USR-002 (auth admin)

### Riscos
- Escopo: não incluir transcode nesta US — pipeline HLS é US separada
```

---

## Handoff da Strategy Agent

**Entrada esperada** quando a recomendação for **go** (ou **defer** com escopo reduzido):

- Business Case completo (problema, solução, valor, critérios de sucesso)
- Pilar e agregado(s) vinculados
- Estimativa de esforço e apps/packages afetados
- Opcional: Problem Statement e citações da `discovery-agent`

Se a Strategy Agent recomendar **no-go**, não gere US — indique ao usuário revisar ou descartar a demanda.

---

## Handoff para UX Agent

Quando as US incluírem superfície `apps/web` ou `apps/admin`, indique ao usuário invocar a skill `ux-agent` antes da implementação.

A UX Agent revisará telas e fluxos quanto a consistência, usabilidade, acessibilidade e alinhamento com contratos da API.

**O que enviar à UX Agent:**

- User Stories completas com critérios de aceite (IDs `US-*`)
- Wireframes, mockups ou descrições de fluxo (se existirem)
- Pilar, agregado(s) e superfície por US

US puramente backend/worker sem UI podem pular o UX Agent — ver atalhos em [../FLUXO.md](../FLUXO.md).

---

## Handoff para Architect / Planning Agent

Após US finalizadas (e aprovação da `ux-agent`, quando houver UI):

- **Decisão arquitetural pendente** (contrato cross-app, pipeline, módulo DDD) → `architect-agent` → depois `planning-agent`
- **Sem decisão arquitetural nova** → `planning-agent` direto

Checklist de implementação e ordem técnica: [planning-agent/reference.md](../planning-agent/reference.md) e [dev-agent/reference.md](../dev-agent/reference.md).
