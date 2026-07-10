# Media Gate — operação e verificação

Proteção da entrega de mídia contra scanners/hotlinking (ADR-007, camadas 0+1).
Origin privado + token HMAC curto (`?t=`) validado na borda antes de servir.

## Componentes

| Papel            | Dev                                                                                      | Prod                                    |
| ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| Emissor do token | API (`apps/api/src/infra/media/media-token.ts`)                                          | idem                                    |
| Gate (validador) | Caddy `forward_auth` → `GET /v1/media/verify`                                            | Cloudflare Worker (`infra/media-gate/`) |
| Origin           | MinIO (anonymous atrás do gate)                                                          | R2 **privado** (só o Worker lê)         |
| Player           | loader do hls.js reanexa `?t=` a cada segmento (`apps/web/app/composables/usePlayer.ts`) | idem                                    |

`MEDIA_TOKEN_SECRET` **precisa ser o mesmo** na API e no gate. Rotacionar o secret
invalida todos os tokens em circulação (TTL curto, ~10 min, então o impacto é breve).

## Deploy — ordem obrigatória

As mudanças de emissão (API), gate e origin são **acopladas**: fechar o origin sem o
gate no ar, ou emitir token sem o player propagá-lo, derruba a reprodução. Suba juntos:

1. API com emissão de token + `MEDIA_TOKEN_SECRET`.
2. Gate no ar com o mesmo secret (Worker deployado / Caddy atualizado).
3. Web com o player que propaga o `?t=`.
4. Só então feche o origin (R2 privado / remover exposição pública).

## Verificação

### Automatizada (já no CI)

- `apps/api` — `media-token.test.ts`, `media-authorization.test.ts`,
  `media-verify.routes.test.ts`, `media-token.worker-compat.test.ts`
  (prova que o Worker/Web Crypto aceita os tokens da API/node:crypto).
- `apps/web` — `media-token.spec.ts`, `usePlayer.spec.ts`.

### Manual — prod (Cloudflare Worker sobre R2)

Com `CDN=https://cdn.playplus.com.br` e um `videoId` publicado:

```sh
# 1. Sem token → 403
curl -s -o /dev/null -w '%{http_code}\n' "$CDN/videos/$videoId/hls/master.m3u8"        # 403

# 2. Token válido (pegue o ?t= da resposta de GET /v1/videos/:id) → 200
curl -s -o /dev/null -w '%{http_code}\n' "$CDN/videos/$videoId/hls/master.m3u8?t=$TOKEN" # 200

# 3. Token de outro vídeo / adulterado / expirado → 403
curl -s -o /dev/null -w '%{http_code}\n' "$CDN/videos/$videoId/hls/master.m3u8?t=$OUTRO" # 403

# 4. Acesso direto ao R2 (sem passar pelo Worker) → negado
#    Confirme no painel Cloudflare que o bucket NÃO tem r2.dev público nem custom
#    domain ligado direto ao bucket.
```

### Manual — dev (Caddy forward_auth sobre MinIO)

```sh
# Sem token, pelo host gateado → 403
curl -sk -o /dev/null -w '%{http_code}\n' "https://storage.playplus.localhost/playplus/videos/$videoId/hls/master.m3u8"      # 403
# Com token válido → 200
curl -sk -o /dev/null -w '%{http_code}\n' "https://storage.playplus.localhost/playplus/videos/$videoId/hls/master.m3u8?t=$TOKEN" # 200
```

> Em dev o MinIO permanece anonymous-download **por trás do gate** (o Caddy não
> assina SigV4). A proteção real de produção é o R2 privado + Worker. A porta 9000
> exposta é conveniência local, não superfície de produção.

## Limitação conhecida — iOS Safari (HLS nativo)

O token viaja como query param propagado pelo loader do hls.js. No iOS Safari, sem
MSE, o player usa HLS **nativo** e não injeta o token nos segmentos relativos →
segmentos protegidos falham. Resolver exige transporte por **cookie** (o Worker
setaria o cookie escopado ao path do vídeo). Decisão adiada; ver ADR-007.
