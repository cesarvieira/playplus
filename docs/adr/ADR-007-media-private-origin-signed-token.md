# ADR-007: Origin privado + token assinado na borda para entrega de mídia

**Data:** 2026-07-09
**Status:** Aceito

## Contexto

Todo o conteúdo de storage está **publicamente acessível**:

- `docker-compose.yml` roda `mc anonymous set download` no bucket — qualquer objeto é baixável anonimamente. Em prod, o R2 tem o equivalente via binding público `r2.dev` / domínio sem gate.
- A API monta `stream_url`/`thumbnail_url` como URL pública crua (`buildStreamUrl`/`buildThumbnailUrl`) apontando para `CDN_BASE_URL`, sem assinatura nem token.
- HLS amplifica: `master.m3u8` referencia playlists e segmentos `.ts` por **caminho relativo** — cada segmento é um GET anônimo direto ao storage. As chaves UUID (`videos/{id}/hls/...`) são apenas _security by obscurity_ e vazam via referer, logs e pela própria resposta da API.

Resultado: scanners de bucket aberto enumeram o conteúdo e há hotlinking livre. O [ADR-003](./ADR-003-hls-delivery-dev-nginx-proxy.md) aceitou "sem autenticação no gate; URLs HLS são obscurity suficiente para dev solo" — premissa **não mais aceitável** com o conteúdo exposto publicamente.

Adotamos as duas primeiras camadas do modelo usado por grandes plataformas (CloudFront _signed cookies_ / Akamai _token auth_): **origin privado** + **token assinado validado na borda**. AES-128 (camada 2) e DRM (camada 3) ficam fora deste escopo.

## Decisão

### Camada 0 — Origin privado

Nenhum objeto público é alcançável sem passar pelo gate.

- **Prod (R2):** bucket **totalmente privado** — sem binding `r2.dev` nem custom domain ligado direto ao bucket. O único leitor é o Worker (`infra/media-gate`), que lê via binding R2. Este é o alvo real contra scanners.
- **Dev (MinIO):** o bucket permanece `anonymous-download` **por necessidade técnica** — o gate de dev é o `forward_auth` do Caddy, e o Caddy não assina SigV4, então o proxy de leitura exige que o MinIO sirva sem assinatura. A proteção local é o gate no host `storage.` (toda requisição de leitura pública sem token → 403); o acesso direto à porta 9000 é conveniência de dev, não superfície de produção. Truly-private em dev exigiria o gate streamando pela API (assinando o GET) — descartado por decisão de manter o byte-stream fora da API.

### Camada 1 — Token assinado, escopado por vídeo, validado na borda

- **Token:** HMAC-SHA256 sobre payload compacto `{ prefix: "videos/{id}", exp, nonce }`, chave `MEDIA_TOKEN_SECRET`. Emitido pela **API**.
- **Escopo:** o token autoriza o **prefixo** `videos/{id}` inteiro — cobre `master.m3u8`, playlists por qualidade, segmentos `.ts` e a thumbnail com uma única credencial.
- **Transporte:** **query param `?t=` em toda requisição**. O manifesto é entregue com `?t=<token>`; um loader custom do `hls.js` (Fase 5) propaga o **mesmo** token para cada playlist e segmento (as URLs relativas do HLS perdem a query na resolução, então o player a reanexa). Escolhido em vez de cookie porque o gate de dev usa `forward_auth` no Caddy, onde setar cookie no cliente no caminho de sucesso é inviável; o modelo query-per-request valida cada requisição de forma independente e stateless — idêntico no Worker de prod.
- **TTL:** curto (default `600s`), renovável reemitindo o token via `GET /videos/:id`.
- **Validação no gate:** confere assinatura + `exp` + que o objeto requisitado casa com `prefix`.

### Onde o gate roda

- **Prod:** Cloudflare Worker na frente do R2 privado (binding R2) — valida o token e faz stream. Preserva cache de borda e egress grátis do R2.
- **Dev:** o Caddy intercepta `storage.*` e consulta a API via `forward_auth` (`GET /v1/media/verify`), que valida o token e responde 204/403; no 204 o Caddy faz proxy do objeto no MinIO privado. Preflight CORS (`OPTIONS`) contorna o gate. Mesma lógica de validação do Worker.

### Escopo de acesso (v0)

**Anônimo-por-vídeo** (sem exigir login) — casa com o objetivo de proteger contra scanners/hotlinking. O token é desenhado para, no futuro, embutir uma claim de usuário e virar acesso autenticado **sem reescrever o gate**.

### Cache

Cache-key na Cloudflare ignora o token (não fragmenta o cache), mas o Worker valida **antes** de servir. Segmentos `.ts` cacheáveis; `.m3u8` com TTL curto.

## Alternativas consideradas

- **Presigned URLs + reescrita de manifesto:** TTL expira mid-playback em vídeo longo e joga lógica para o player. Rejeitado (também já rejeitado no ADR-003).
- **API faz proxy de todos os segmentos em prod:** egress do vídeo passa pela VPS, perde egress grátis do R2 e cache de borda. Rejeitado para prod; usado apenas como gate em dev.
- **Bucket público + bloqueio só por `Referer`:** trivialmente burlável. Rejeitado.
- **AES-128 / DRM:** fora do escopo v0 (camadas 2/3); podem ser adicionados depois sobre o mesmo gate.

## Consequências

- **Positivas:** bucket fechado mata scanner e enumeração; hotlinking e URL vazada morrem no `exp`; mesmo contrato de token dev↔prod; caminho de upgrade limpo para auth por usuário e AES-128.
- **Negativas:** novo componente (Worker) em prod; a API passa a emitir token (cripto a manter); o player precisa enviar credenciais; **as Fases 2–3–4 têm deploy acoplado** — fechar o bucket sem o gate no ar derruba o playback.

## Impacto Play+

- **Agregado(s):** Video
- **Superfície(s):** infra (Docker, Caddy, Cloudflare Worker), `apps/api` (emissão do token), `apps/web` (player), `packages/shared` (paths)
- **Contratos:** `stream_url`/`thumbnail_url` passam a conter token / exigir cookie e mudam de host (`MEDIA_GATE_URL`). Consumidores que assumiam URL pública estável quebram.
- **Breaking change:** sim (entrega de mídia) — coordenar deploy das Fases 2–3–4.
- **Supersede:** parcialmente o [ADR-003](./ADR-003-hls-delivery-dev-nginx-proxy.md) — a cláusula "sem autenticação no gate". O reverse proxy de dev continua, agora com validação de token.

## Revisão em

Adição de login obrigatório (migrar token para derivado de sessão) ou de AES-128 (camada 2).
