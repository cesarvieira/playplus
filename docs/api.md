# API contracts

Padrão REST com WebSocket pontual para eventos em tempo real.

---

## Convenções

**Base URL:** `https://api.playplus.local/v1`

**Padrão de URL:**
```
/modulo/recurso/:id
/modulo/recurso/:id/acao   ← apenas quando não mapeável por verbo HTTP
```

**Autenticação:** `Authorization: Bearer <access_token>` em todas as rotas protegidas.

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
O `refresh_token` é retornado em cookie `httpOnly; Secure; SameSite=Strict` com TTL de 7 dias.

---

### `POST /auth/refresh`
Gera novo par de tokens. O refresh token atual é invalidado imediatamente (rotation).

**Cookie:** `refresh_token` (automático)

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
Invalida o refresh token no Valkey e limpa o cookie.

**Response `204`:** sem body.

---

## Videos

### `GET /videos`
Lista vídeos disponíveis.

**Query params:** `page`, `limit`, `status` (`ready` | `processing` | `error`)

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "duration": 7240,
      "thumbnail_url": "https://cdn.../thumb.jpg",
      "status": "ready",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20 }
}
```

---

### `GET /videos/:id`
Retorna metadados completos de um vídeo, incluindo progresso salvo do usuário autenticado.

**Response `200`:**
```json
{
  "id": "uuid",
  "title": "...",
  "duration": 7240,
  "thumbnail_url": "https://cdn.../thumb.jpg",
  "stream_url": "https://cdn.../master.m3u8",
  "status": "ready",
  "progress": {
    "position": 3420,
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "created_at": "2025-01-01T00:00:00Z"
}
```

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

**Endpoint:** `wss://api.playplus.local/v1/ws?token=<access_token>`

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

```
1. POST /auth/login
   → access_token (body) + refresh_token (cookie httpOnly)

2. Requisições autenticadas
   → Authorization: Bearer <access_token>

3. access_token expira (15min)
   → POST /auth/refresh (cookie enviado automaticamente)
   → novo access_token + refresh_token rotacionado

4. POST /auth/logout
   → refresh_token invalidado no Valkey
   → cookie removido
```

**Duração dos tokens:**

| Token | Duração | Armazenamento |
|---|---|---|
| `access_token` | 15 minutos | memória do cliente (não localStorage) |
| `refresh_token` | 7 dias | cookie `httpOnly` + Valkey (TTL) |

---

## Códigos de erro

| Código | HTTP | Descrição |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token ausente ou inválido |
| `FORBIDDEN` | 403 | Sem permissão para o recurso |
| `VIDEO_NOT_FOUND` | 404 | Vídeo não encontrado |
| `USER_NOT_FOUND` | 404 | Usuário não encontrado |
| `VIDEO_NOT_READY` | 409 | Vídeo ainda em processamento |
| `JOB_ALREADY_QUEUED` | 409 | Job de transcodificação já na fila |
| `INVALID_TOKEN` | 401 | Refresh token inválido ou expirado |
| `VALIDATION_ERROR` | 422 | Body da requisição inválido |
| `INTERNAL_ERROR` | 500 | Erro interno — ver Sentry |