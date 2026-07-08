# API contracts

Padrão REST com WebSocket pontual para eventos em tempo real.

---

## Convenções

**Base URL:** `https://api.playplus.localhost/v1`

**Padrão de URL:**

```
/modulo/recurso/:id
/modulo/recurso/:id/acao   ← apenas quando não mapeável por verbo HTTP
```

**Autenticação:** depende do caller:

| Caller                 | Headers                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| Browser / client admin | `Authorization: Bearer <access_token>` (JWT do usuário)                     |
| Admin SSR (Nitro)      | `Authorization: Bearer <M2M_SERVICE_TOKEN>` + `X-User-Id: <delegation JWT>` |

O JWT de delegação (`X-User-Id`) é HS256, claim `sub` = UUID do usuário, TTL curto (`DELEGATION_JWT_TTL_SECONDS`, default 60s). A API valida M2M **e** assinatura antes de confiar na identidade.

Rotas protegidas aceitam **um dos dois modos** — nunca Bearer de usuário repassado pelo SSR.

**Formato:** `Content-Type: application/json` em todas as requisições e respostas.

**Envelope de resposta:**

```json
// 200 / 201 com body → objeto direto, sem envelope
{ "id": "uuid", "title": "..." }

// 204 → sem body (delete, logout)

// lista → único caso com envelope
{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 20 } }

// erro → sempre envelopado
{ "error": { "code": "VIDEO_NOT_FOUND", "message": "..." } }
```

---

## Auth

### `POST /auth/login`

Autentica o usuário e retorna o par de tokens.

**Body:**

```json
{ "email": "user@example.com", "password": "..." }
```

**Response `200`:**

```json
{
  "access_token": "<jwt>",
  "expires_in": 900
}
```

O `refresh_token` é retornado em cookie:

```
refresh_token=<opaque>;
  HttpOnly; Secure; SameSite=None;
  Path=/v1/auth/refresh;
  Domain=api.playplus.localhost   ← produção: api.playplus.com.br
  Max-Age=604800
```

O `access_token` **não** é cookie da API — o body JSON é usado pelo browser para Pinia (Bearer client-side) e sincronizado no admin via `POST /api/session/sync` (cookie HttpOnly no domínio admin).

**CORS com credentials:** `POST /v1/auth/login`, `/v1/auth/refresh` e `/v1/auth/logout` expõem `Access-Control-Allow-Credentials: true` para a origem do admin (`CORS_ADMIN_ORIGIN`). Demais rotas não usam credentials cross-origin — o client envia apenas `Authorization: Bearer`. O preflight dessas rotas aceita `GET`, `POST`, `PATCH`, `DELETE` e `PUT` (ex.: `PATCH /videos/:id/publish|schedule|unpublish`).

---

### `POST /auth/refresh`

Gera novo par de tokens. O refresh token atual é invalidado imediatamente (rotation).

**Origem:** chamada cross-origin do admin (`credentials: 'include'`) ou proxy SSR repassando o header `Cookie`.

**Cookie:** `refresh_token` (automático, domínio API)

**CORS:** `Access-Control-Allow-Origin: <CORS_ADMIN_ORIGIN>` · `Allow-Credentials: true` · `Allow-Methods: POST`

**Response `200`:**

```json
{
  "access_token": "<jwt>",
  "expires_in": 900
}
```

Novo `refresh_token` retornado em cookie. O token anterior é removido do Valkey.

---

### `POST /auth/logout`

Invalida o refresh token no Valkey e limpa o cookie da API.

**Cookie:** `refresh_token` enviado automaticamente (domínio API).

**Response `204`:** sem body.

O admin também chama `POST /api/session/logout` (Nitro) para limpar o cookie `access_token` no domínio admin.

---

## Admin — rotas Nitro (sessão)

Rotas internas do admin (`apps/admin`), same-origin. Não substituem a API.

### `POST /api/session/sync`

Grava o `access_token` recebido no login/refresh como cookie HttpOnly no domínio admin.

**Body:**

```json
{ "access_token": "<jwt>", "expires_in": 900 }
```

**Response `200`:** `{ "ok": true }`

Valida o JWT com `JWT_SECRET` antes de setar o cookie. Rejeita tokens inválidos com `401`.

---

### `POST /api/session/logout`

Remove o cookie `access_token` do domínio admin.

**Response `200`:** `{ "ok": true }`

A revogação do refresh token continua em `POST /v1/auth/logout` na API.

---

### `GET /me`

Retorna o perfil do usuário autenticado.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "viewer",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Erros:** `401 UNAUTHORIZED` · `404 USER_NOT_FOUND`

---

## Videos

### `GET /videos`

Lista vídeos disponíveis.

**Query params:** `page`, `limit`, `status` (`ready` | `processing` | `error`), `include_unpublished` (`boolean`, default `false`, **somente admin**)

**Response `200`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "duration": 7240,
      "thumbnail_url": "https://cdn.example.com/videos/uuid/hls/thumbnail.jpg",
      "status": "ready",
      "published_at": "2025-01-01T00:00:00Z",
      "upload_complete": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20 }
}
```

`thumbnail_url`: URL pública derivada de `{CDN_BASE_URL}/{thumbnail_key}` (key interna no storage, não exposta na API). `null` quando o worker ainda não gerou o frame.

`upload_complete`: `boolean` — presente em itens com `status: pending`. `false` = aguardando upload ao storage; `true` = arquivo no storage, pronto para `POST /videos/:id/transcode`. Omitido ou `true` nos demais status.

**Filtros admin (v0):** pill **Em andamento** agrupa `queued` + `processing` no client — a API não expõe filtro único para ambos; `queued` aparece na listagem sem query param dedicado.

**Filtro de publicação:** por padrão, todos os callers (incluindo admin) recebem apenas vídeos com `published_at` no passado ou presente (`published_at IS NOT NULL AND published_at <= NOW()`). Rascunhos (`published_at: null`) e agendados (data futura) ficam ocultos no catálogo web. O painel admin passa `include_unpublished=true` para listar rascunhos e agendados.

---

### `GET /videos/:id`

Retorna metadados completos de um vídeo, incluindo progresso salvo do usuário autenticado.

**Response `200`** (vídeo com `status: ready`):

```json
{
  "id": "uuid",
  "title": "...",
  "duration": 7240,
  "thumbnail_url": "https://cdn.example.com/videos/uuid/hls/thumbnail.jpg",
  "stream_url": "https://cdn.example.com/videos/uuid/hls/master.m3u8",
  "status": "ready",
  "progress": {
    "position": 3420,
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "published_at": "2025-01-01T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Response `200`** (vídeo com `status` diferente de `ready` — metadados sem reprodução):

```json
{
  "id": "uuid",
  "title": "...",
  "duration": null,
  "thumbnail_url": null,
  "status": "processing",
  "progress": null,
  "published_at": null,
  "created_at": "2025-01-01T00:00:00Z"
}
```

`thumbnail_url`: `null` enquanto o worker não extraiu o frame. Mesma derivação CDN descrita em `GET /videos`.

`stream_url` omitido quando o vídeo não está pronto. A UI do player (`apps/web`) deve tratar `status !== ready` sem montar HLS.

**Response `409`** (alternativa quando cliente solicita reprodução e vídeo não está pronto):

```json
{
  "error": {
    "code": "VIDEO_NOT_READY",
    "message": "Vídeo ainda em processamento"
  }
}
```

Aplicável quando `status` é `pending`, `queued` ou `processing`. A implementação pode retornar `200` com metadados parciais (acima) **ou** `409` — a UI deve tratar ambos.

**Query params:** `include_unpublished` (`boolean`, default `false`, **somente admin**)

**Filtro de publicação:** por padrão retorna `404 VIDEO_NOT_FOUND` para vídeos não publicados (`published_at: null`) ou com publicação futura. Admin pode passar `include_unpublished=true` para acessar qualquer vídeo por ID (ex.: preview no painel).

**Erros:** `404 VIDEO_NOT_FOUND` · `401 UNAUTHORIZED`

---

### `POST /videos` 🔒 admin

Registra um novo vídeo e inicia o upload.

**Body:**

```json
{
  "title": "...",
  "file_name": "movie.mp4",
  "file_size": 4294967296
}
```

**Response `201`:**

```json
{
  "id": "uuid",
  "upload_url": "https://storage.../presigned",
  "status": "pending"
}
```

O cliente faz upload direto para a `upload_url` (MinIO/R2 presigned). Ao concluir, chama `/videos/:id/transcode`.

---

### `POST /videos/:id/upload-url` 🔒 admin

Renova a URL presigned de um vídeo com `status: pending` — usado quando a URL anterior expirou antes do upload concluir, sem recriar o registro.

**Response `200`:**

```json
{
  "id": "uuid",
  "upload_url": "https://storage.../presigned",
  "status": "pending"
}
```

**Erros:** `404 VIDEO_NOT_FOUND` · `409` se vídeo não estiver em `pending` (ex.: transcode já enfileirado)

---

### `POST /videos/:id/transcode` 🔒 admin

Dispara o job de transcodificação após o upload concluído.

**Response `202`:**

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

A partir daqui, o progresso é acompanhado via WebSocket.

---

### `PATCH /videos/:id/publish` 🔒 admin

Publica o vídeo imediatamente — define `published_at = NOW()`.

**Response `200`:**

```json
{
  "id": "uuid",
  "published_at": "2026-07-04T12:00:00.000Z"
}
```

**Erros:** `401 UNAUTHORIZED` · `403 FORBIDDEN` · `404 VIDEO_NOT_FOUND`

---

### `PATCH /videos/:id/schedule` 🔒 admin

Agenda publicação futura — define `published_at` para a data informada.

**Body:**

```json
{
  "published_at": "2030-01-01T00:00:00.000Z"
}
```

A data deve ser estritamente futura (`published_at > NOW()`).

**Response `200`:**

```json
{
  "id": "uuid",
  "published_at": "2030-01-01T00:00:00.000Z"
}
```

**Erros:** `401 UNAUTHORIZED` · `403 FORBIDDEN` · `404 VIDEO_NOT_FOUND` · `422 VALIDATION_ERROR` (data no passado ou igual a now)

---

### `PATCH /videos/:id/unpublish` 🔒 admin

Despublica o vídeo — define `published_at = NULL` (rascunho, invisível no catálogo web).

**Response `200`:**

```json
{
  "id": "uuid",
  "published_at": null
}
```

**Erros:** `401 UNAUTHORIZED` · `403 FORBIDDEN` · `404 VIDEO_NOT_FOUND`

---

### `DELETE /videos/:id` 🔒 admin

Remove o vídeo e todos os seus assets (segmentos HLS, thumbnail, arquivo original).

**Response `204`:** sem body.

---

## Users 🔒 admin

### `GET /users`

Lista usuários cadastrados.

**Response `200`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "...",
      "role": "viewer",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### `POST /users` 🔒 admin

Cria um novo usuário.

**Body:**

```json
{ "email": "...", "password": "...", "role": "viewer" }
```

**Response `201`:**

```json
{ "id": "uuid", "email": "...", "role": "viewer" }
```

---

### `DELETE /users/:id` 🔒 admin

**Response `204`:** sem body.

---

## WebSocket

**Endpoint:** `wss://api.playplus.localhost/v1/ws?token=<access_token>`

Autenticação via query param — necessário pois o browser não suporta headers customizados no handshake WebSocket.

Todas as mensagens seguem o envelope:

```json
{ "type": "evento.nome", "payload": { ... } }
```

---

### Eventos do servidor → cliente

#### `video.status`

Emitido pelo worker durante e após a transcodificação.

```json
{
  "type": "video.status",
  "payload": {
    "video_id": "uuid",
    "job_id": "uuid",
    "status": "processing",
    "progress": 47
  }
}
```

`status`: `queued` | `processing` | `ready` | `error`
`progress`: 0–100, percentual de conclusão do FFmpeg.

---

#### `video.error`

Emitido quando o job falha após esgotar as tentativas de retry.

```json
{
  "type": "video.error",
  "payload": {
    "video_id": "uuid",
    "job_id": "uuid",
    "reason": "ffmpeg_exit_code_1"
  }
}
```

---

### Eventos do cliente → servidor

#### `player.progress`

Enviado pelo player a cada ~10 segundos com a posição atual.

```json
{
  "type": "player.progress",
  "payload": {
    "video_id": "uuid",
    "position": 3420
  }
}
```

O servidor persiste no banco via upsert em `watch_progress`.

---

## Fluxo de autenticação

### Browser (client)

```
1. POST /auth/login (API, credentials)
   → access_token (body) + refresh_token (cookie API)

2. POST /api/session/sync (admin Nitro)
   → access_token (cookie HttpOnly admin)

3. Chamadas autenticadas client-side
   → Authorization: Bearer <access_token da Pinia>

4. access_token expira (~15 min)
   → POST /auth/refresh (API, credentials cross-origin)
   → POST /api/session/sync
   → retry da request original

5. POST /auth/logout (API) + POST /api/session/logout (admin)
   → refresh revogado no Valkey + cookies limpos
```

### Admin SSR (Nitro)

```
1. Browser → GET /pagina (cookie access_token admin automático)

2. SSR lê cookie → se expirado, POST /auth/refresh (forward Cookie)
   → propaga Set-Cookie ao browser

3. SSR → GET /v1/... na API
   → Authorization: Bearer <M2M_SERVICE_TOKEN>
   → X-User-Id: <delegation JWT com sub=userId>

4. API valida M2M + delegação → dados → HTML
```

O token JWT do usuário **nunca** trafega do SSR para a API.

**Duração dos tokens:**

| Token                         | Duração | Armazenamento                                                |
| ----------------------------- | ------- | ------------------------------------------------------------ |
| `access_token` (admin cookie) | 15 min  | Cookie `HttpOnly; Secure; SameSite=Lax` no domínio admin     |
| `access_token` (client)       | 15 min  | Pinia (memória) — Bearer e WebSocket                         |
| `refresh_token`               | 7 dias  | Cookie `HttpOnly` domínio API + Valkey (whitelist, rotation) |
| Delegation JWT (`X-User-Id`)  | ~60 s   | Gerado por request no Nitro — não persistido                 |
| `M2M_SERVICE_TOKEN`           | manual  | `runtimeConfig` server-only (admin + env API)                |

Checklist E2E: [checklist-auth-ssr-m2m.md](./checklist-auth-ssr-m2m.md)

---

## Códigos de erro

| Código               | HTTP | Descrição                          |
| -------------------- | ---- | ---------------------------------- |
| `UNAUTHORIZED`       | 401  | Token ausente ou inválido          |
| `FORBIDDEN`          | 403  | Sem permissão para o recurso       |
| `VIDEO_NOT_FOUND`    | 404  | Vídeo não encontrado               |
| `USER_NOT_FOUND`     | 404  | Usuário não encontrado             |
| `VIDEO_NOT_READY`    | 409  | Vídeo ainda em processamento       |
| `JOB_ALREADY_QUEUED` | 409  | Job de transcodificação já na fila |
| `INVALID_TOKEN`      | 401  | Refresh token inválido ou expirado |
| `VALIDATION_ERROR`   | 422  | Body da requisição inválido        |
| `INTERNAL_ERROR`     | 500  | Erro interno — ver Sentry          |
