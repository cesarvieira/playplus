# Strategy Agent — Referência Play+

Material de apoio para análises estratégicas. Fonte de verdade completa: `AGENTS.md`, `docs/api.md`, `docs/stack.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — entrada da `discovery-agent` (fase 01); saída **go** → `requirements-agent` (fase 03).

---

## Pilares do projeto

| Pilar                     | Descrição                                                      | Exemplos de features                                         |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| **Histórias organizadas** | Catálogo claro, metadados úteis, busca e navegação             | Listagem de vídeos, tags, capas, séries/episódios            |
| **Experiências simples**  | UX tranquila, retomar de onde parou, player confiável          | Progresso de reprodução, retomada automática, player HLS     |
| **Privacidade**           | Controle de acesso, storage privado, auth segura               | JWT + refresh rotation, roles viewer/admin, upload presigned |
| **Liberdade**             | Sem billing, sem multi-tenancy, sem complexidade desnecessária | Uso pessoal, sem planos/pagamentos, sem escala enterprise    |
| **Aprendizado contínuo**  | Laboratório técnico — monorepo, DDD, HLS, FFmpeg               | Novas stacks, padrões arquiteturais, pipeline de mídia       |

Se a demanda não mapeia claramente a nenhum pilar, trate como risco principal antes de recomendar go.

---

## Mapa de agregados

| Agregado         | Responsabilidade                                            | Status    | Dependências                     |
| ---------------- | ----------------------------------------------------------- | --------- | -------------------------------- |
| **User**         | Autenticação, roles (`viewer` / admin), gestão de usuários  | Planejado | Nenhuma — base do MVP            |
| **Video**        | Upload presigned, transcodificação HLS, catálogo, metadados | Planejado | User (rotas admin 🔒)            |
| **WatchSession** | Progresso (`watch_progress`), retomada via WebSocket        | Planejado | User + Video com `status: ready` |

**Ordem sugerida de MVP:** User → Video (upload + transcode) → WatchSession → polish UX

**Comunicação entre agregados:** tipos cruzados via `packages/shared` apenas. `api` ↔ `worker` somente via fila BullMQ/Valkey.

---

## Matriz de esforço relativo

| Nível     | Critério Play+                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| **Baixo** | 1 app, sem worker, sem mudança em `packages/shared`, sem migration                                                 |
| **Médio** | 2+ apps ou `shared` + migration PostgreSQL; sem FFmpeg                                                             |
| **Alto**  | Pipeline HLS, worker FFmpeg, storage/CDN, WebSocket, ou 3+ superfícies (`api`, `worker`, `web`, `admin`, `shared`) |

Ao estimar, liste explicitamente quais apps/packages seriam afetados.

---

## Red flags automáticas

Sinalize como risco ou no-go se a demanda implicar. Lista arquitetural completa (com alternativas): [architect-agent/reference.md](../architect-agent/reference.md).

Resumo estratégico:

- Multi-tenancy ou isolamento por tenant
- Billing, assinaturas ou planos pagos
- Upload binário passando pela API (deve ser presigned URL direto ao storage)
- Transcodificação síncrona na rota HTTP (deve ser job BullMQ assíncrono)
- Polling onde WebSocket já está definido (status de transcode, progresso do player)
- Expor credenciais R2 ou storage ao cliente
- Import direto entre apps (`apps/web` → `apps/api`, etc.)
- Lógica de negócio em `http/` ou `infra/` (viola DDD)
- Escalabilidade enterprise (sharding, múltiplos workers, load balancer) sem pedido explícito

---

## Superfícies do monorepo

| Superfície        | Quando entra na análise                                  |
| ----------------- | -------------------------------------------------------- |
| `apps/api`        | Rotas HTTP, use cases, WebSocket, enfileiramento de jobs |
| `packages/worker` | FFmpeg, upload de segmentos HLS, jobs de mídia           |
| `packages/shared` | Tipos, DTOs, enums, erros — impacto nos dois frontends   |
| `apps/web`        | Player, catálogo público, progresso, auth viewer         |
| `apps/admin`      | Upload, gestão de vídeos/usuários, fila de jobs          |
| Infra Docker      | postgres, valkey, minio/R2, compose prod vs dev          |

---

## Pipeline de vídeo (referência rápida)

Detalhes completos em `AGENTS.md` e `docs/api.md`. Resumo:

1. `POST /videos` (admin) → presigned upload_url
2. Cliente upload direto → MinIO/R2
3. `POST /videos/:id/transcode` → job BullMQ
4. Worker FFmpeg → HLS (240p–1080p, 4s/segmento)
5. Worker upload `.ts` + `.m3u8` → storage
6. WebSocket: `video.status` / `video.error`
7. `GET /videos/:id` → `stream_url` (CDN master.m3u8)

Features que alteram qualquer etapa acima = esforço **alto** por padrão.

---

## Handoff para Requirements Agent

Quando a recomendação for **go** (ou **defer** com escopo reduzido e claro), indique ao usuário invocar a skill `requirements-agent` passando o Business Case como input.

A Requirements Agent transformará o Business Case em User Stories com critérios de aceite, mapeamento agregado/superfície e ordem de implementação.

**Próximo agente:** `requirements-agent` — ver pipeline em [../FLUXO.md](../FLUXO.md).

**O que enviar à Requirements Agent:**

- Business Case completo (problema, solução, valor, critérios de sucesso)
- Pilar e agregado(s) vinculados
- Estimativa de esforço e apps/packages afetados
- Opcional: Problem Statement e citações da `discovery-agent`

Se a recomendação for **no-go**, não há handoff — a demanda deve ser revisada ou descartada.
