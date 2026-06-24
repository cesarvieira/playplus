# Checklist E2E — Auth SSR + M2M (ADR-006)

Validação manual com **HTTPS local** (mkcert). Pré-requisitos: [README §3](../README.md) e infra + API + admin no ar (`pnpm dev` com variáveis TLS e cookies HTTPS).

Credenciais seed: `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` do `.env`.

---

## 1. Login HTTPS → cookies corretos

- [ ] Acessar `https://admin.playplus.localhost:3001/login`
- [ ] Login com admin seed → redirect para `/videos`
- [ ] DevTools → Application → Cookies:
  - [ ] `access_token` em **admin.playplus.localhost** — `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`
  - [ ] `refresh_token` em **api.playplus.localhost** — `HttpOnly`, `Secure`, `SameSite=None`, `Path=/v1/auth/refresh`

## 2. SSR render com dados via M2M

- [ ] Hard reload em `/videos` (Ctrl+Shift+R)
- [ ] HTML inicial já contém contagem de vídeos (não só spinner pós-hidratação)
- [ ] Network → request SSR à API **não** envia `Authorization: Bearer <user-jwt>` do browser
- [ ] Logs/API: chamada server-side usa `Authorization: Bearer <M2M>` + header `X-User-Id`

## 3. Access expirado → refresh silencioso no SSR

- [ ] Reduzir temporariamente `JWT_ACCESS_TTL_SECONDS=30` no `.env` (API + admin `jwtSecret` inalterado)
- [ ] Aguardar expiração, hard reload em `/videos`
- [ ] Página carrega com dados; response inclui novos `Set-Cookie` (access admin + refresh API rotacionado)
- [ ] Restaurar `JWT_ACCESS_TTL_SECONDS=900`

## 4. Client 401 → refresh cross-origin → retry

- [ ] Com sessão ativa, expirar access (TTL curto ou limpar Pinia via DevTools sem logout)
- [ ] Navegar client-side ou disparar ação que chama API (ex.: recarregar lista)
- [ ] Network: `POST /v1/auth/refresh` na API (credentials) → retry da request original → `200`

## 5. Duas requests 401 → um refresh

- [ ] Com access expirado, abrir página que dispara ≥2 chamadas API paralelas (ex.: futuras abas/dados)
- [ ] Network: apenas **um** `POST /auth/refresh` antes dos retries

## 6. Logout → revogação server-side

- [ ] Clicar **Sair**
- [ ] Cookies `access_token` (admin) e `refresh_token` (API) removidos ou expirados
- [ ] `POST /v1/auth/refresh` com cookie antigo → `401 INVALID_TOKEN`
- [ ] Valkey: chave `refresh:{tokenId}` ausente (opcional — `redis-cli` / inspeção)

## 7. M2M + X-User-Id forjado → 401

- [ ] Request manual (curl/Insomnia) à API protegida:
  - `Authorization: Bearer <M2M_SERVICE_TOKEN válido>`
  - `X-User-Id: texto-forjado-sem-assinatura`
- [ ] Resposta `401 UNAUTHORIZED`

## 8. CSP sem violações

- [ ] DevTools → Console: sem erros CSP em login, SSR `/videos`, Google Fonts, chamadas API/WS
- [ ] Produção (`pnpm build` + preview): nonces ativos — sem `unsafe-inline` em scripts

---

## Referências

- [ADR-006](./adr/adr-auth-ssr-m2m.md)
- [Contratos API — Auth](./api.md#auth)
- [Runbook rotação M2M](../README.md#rotação-manual-m2m_service_token)
