# ADR-003: Entrega HLS em dev via nginx reverse proxy

**Data:** 2026-06-18  
**Status:** Aceito

## Contexto

US-VID-009 exige playback HLS no browser via `stream_url`. MinIO em dev expõe objetos S3, mas browsers exigem **CORS** corretos para segmentos `.ts` e `.m3u8` de origens diferentes (Nuxt em `:3001` vs MinIO em `:9000`). Em produção, Cloudflare CDN fica na frente do R2 — dev deve espelhar padrão CDN, não expor credenciais.

## Decisão

Serviço **nginx** no Docker Compose faz reverse proxy read-only para objetos HLS no MinIO.

**URL pública dev:** `http://localhost:8080/media/{storage_key}`

Exemplo `stream_url` retornado pela API:

```
http://localhost:8080/media/videos/{videoId}/hls/master.m3u8
```

**Config nginx v0:**

- `location /media/` → proxy_pass para MinIO bucket
- Headers CORS: `Access-Control-Allow-Origin` para origens dev (`localhost:3000`, `3001`, `3002`)
- Cache-Control curto para `.m3u8`, mais longo para `.ts`
- Sem autenticação no nginx v0 (rede local) — catálogo já exige JWT na API; URLs HLS são obscurity suficiente para dev solo

**Variável:** `CDN_BASE_URL=http://localhost:8080/media` — API monta `stream_url` com prefixo + storage key.

Prod (fora v0): `CDN_BASE_URL=https://cdn.playplus.example` apontando para Cloudflare.

## Alternativas consideradas

- **CORS direto no MinIO:** funciona, mas diverge do path prod CDN; config bucket-by-bucket — rejeitado como primário
- **Presigned URLs por segmento:** complexidade alta, TTL curto quebra playback longo — rejeitado
- **API proxy de segmentos:** tráfego de vídeo passa pela VPS/API — rejeitado

## Consequências

- **Positivas:** alinhado a prod (CDN na frente do storage); CORS centralizado; `stream_url` estável
- **Negativas:** mais um container; nginx config versionada no repo

## Impacto Play+

- **Agregado(s):** Video
- **Superfície(s):** infra Docker, `apps/api` (montagem URL), `apps/web` (player)
- **Contratos:** `stream_url` em `GET /videos/:id` — sem mudança de schema
- **Breaking change:** não

## Revisão em

Deploy prod — substituir nginx local por Cloudflare; manter mesma forma de `CDN_BASE_URL`
