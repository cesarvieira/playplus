# Módulo User — Auth API

Sequência manual para validar o ciclo de sessão (ETD §9). Requer API rodando (`pnpm --filter @playplus/api dev`) e serviços Docker (Postgres, Valkey).

Base URL de exemplo: `http://localhost:3000/v1`

## 1. Login

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@playplus.localhost","password":"<senha>"}'
```

Guarde o `access_token` da resposta. O cookie `refresh_token` fica em `cookies.txt`.

## 2. Perfil (GET /me)

```bash
curl -s http://localhost:3000/v1/me \
  -H "Authorization: Bearer <access_token>"
```

Esperado: `200` com `id`, `email`, `role`, `created_at`.

## 3. Refresh (rotation)

```bash
curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:3000/v1/auth/refresh
```

Esperado: `200` com novo `access_token` e cookie `refresh_token` rotacionado.

Repetir refresh com o cookie **anterior** (antes da rotation) deve retornar `401` com `INVALID_TOKEN`.

## 4. Logout

```bash
curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:3000/v1/auth/logout -w "\nHTTP %{http_code}\n"
```

Esperado: `204` sem body; cookie limpo.

Refresh subsequente com o cookie restante deve retornar `401` `INVALID_TOKEN`.

---

Fluxo completo documentado em [`docs/api.md`](../../../../docs/api.md) § Fluxo de autenticação.

**Nota CORS:** clientes browser devem usar `credentials: 'include'` em refresh/logout para enviar o cookie httpOnly.
