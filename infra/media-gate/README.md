# Play+ Media Gate (Cloudflare Worker)

Gate de entrega de mídia de **produção** (ADR-007, camada 1). Fica na frente de um
bucket **R2 privado** e só serve um objeto (`master.m3u8`, playlists, segmentos
`.ts`, thumbnail) após validar o token `?t=` assinado pela API.

Reproduz, com Web Crypto, o mesmo HMAC-SHA256 de
[`apps/api/src/infra/media/media-token.ts`](../../apps/api/src/infra/media/media-token.ts).
O secret **precisa ser idêntico** ao `MEDIA_TOKEN_SECRET` da API.

O equivalente em **dev** é o `forward_auth` do Caddy sobre o MinIO (ver `Caddyfile`
e `apps/api/src/modules/video/http/media-verify.routes.ts`).

## Deploy

```sh
cd infra/media-gate
npm install
wrangler secret put MEDIA_TOKEN_SECRET   # o MESMO secret da API
wrangler deploy
```

Depois:

1. Garanta o R2 **privado** — sem `r2.dev` público nem custom domain ligado direto
   ao bucket. O único caminho de leitura deve ser este Worker.
2. Aponte a rota do Worker para o hostname do CDN (`wrangler.toml` → `[[routes]]`).
3. Na API, defina `CDN_BASE_URL` para esse hostname (ex.: `https://cdn.playplus.com.br`).

## Verificação (Fase 6)

- Objeto sem `?t=` → `403`.
- `?t=` expirado → `403`.
- `?t=` de outro vídeo → `403`.
- `?t=` válido → `200` + bytes.
- Acesso direto ao bucket R2 (sem Worker) → negado.
