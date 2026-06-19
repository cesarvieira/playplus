# Stack decisions

Decisões técnicas do Play+ e suas justificativas.

---

## Backend

**Fastify** — API principal

- TypeScript nativo, ~2x mais rápido que Express
- Overhead mínimo, ideal para VPS com recursos limitados
- Schema validation com JSON Schema embutido

---

## Banco de dados

**PostgreSQL**

- Relacional, robusto, roda no próprio VPS via Docker
- `UPSERT` nativo para a tabela `watch_progress`
- Sem custo adicional de serviço gerenciado

---

## Job queue

**BullMQ + Valkey**

- TypeScript nativo, retry automático com backoff
- UI de monitoramento inclusa (Bull Board)
- Dispara e gerencia os jobs de transcodificação com FFmpeg

Alternativa considerada: `pg-boss` (queue direto no Postgres, elimina o Valkey).
Mantido BullMQ pela maturidade e observabilidade.

---

## Storage

| Ambiente | Serviço | Motivo |
|---|---|---|
| Desenvolvimento | MinIO (self-hosted, Docker) | Sem custo, sem dependência externa, API S3-compatible |
| Produção | Cloudflare R2 | Egress gratuito, integra com CDN Cloudflare nativamente |

Ambos expõem a mesma API S3-compatible — nenhuma mudança de código entre ambientes.
Configuração via variáveis de ambiente: `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

---

## CDN / entrega HLS

**Cloudflare** (plano gratuito)

- Cache dos segmentos `.ts` e `.m3u8` na borda
- Latência baixa globalmente
- Em desenvolvimento: nginx local ou acesso direto ao MinIO

---

## Transcodificação

**FFmpeg**

- Não-negociável para HLS segmentation sem dependência de terceiros
- Segmentos de 4 segundos (seek preciso com baixo rebuffering)
- Resoluções: 240p · 480p · 720p · 1080p
- Output: `master.m3u8` + playlists por qualidade + segmentos `.ts`

---

## Frontend

**Nuxt 4 + Vue 3 + Tailwind CSS 4**

- TypeScript nativo, SSR para metadados de vídeo
- `@nuxtjs/video-player` ou integração direta com `hls.js`
- Composables para gerenciar estado do player e progresso

---

## Infra / deploy

**Docker Compose**

Um único arquivo sobe o ambiente completo:

```
services:
  api        → Fastify
  postgres   → PostgreSQL
  valkey      → Valkey (BullMQ)
  minio      → MinIO (apenas dev)
  worker     → BullMQ worker (FFmpeg jobs)
```

Em produção: mesmo Compose sem o serviço MinIO, apontando para R2 via env vars.

---

## Observabilidade

**Sentry**

- Captura de erros no backend (Fastify) e no frontend (Nuxt)
- Rastreamento de falhas em jobs BullMQ — erros de transcodificação são silenciosos sem isso
- Performance monitoring para identificar gargalos no pipeline de streaming
- Plano gratuito suficiente para uso pessoal (5k erros/mês)

Integração em três pontos críticos:
- `api` — erros de rota, autenticação e acesso ao storage
- `worker` — falhas de FFmpeg e jobs com retry esgotado
- `nuxt` — erros de player, falha de carregamento de segmentos HLS

---

## Resumo

| Camada | Tecnologia |
|---|---|
| Backend | Fastify (TypeScript) |
| Banco de dados | PostgreSQL |
| Job queue | BullMQ + Valkey |
| Storage (dev) | MinIO |
| Storage (prod) | Cloudflare R2 |
| CDN | Cloudflare |
| Transcodificação | FFmpeg |
| Frontend | Nuxt 4 + Vue 3 + Tailwind CSS 4 |
| Observabilidade | Sentry |
| Infra | Docker Compose |
