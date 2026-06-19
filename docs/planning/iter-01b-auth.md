# Iteração 01b — Auth API (complemento)

> **US:** US-USR-001 (conclusão)  
> **Pré-requisito:** [iter-01-foundation.md](./iter-01-foundation.md) T01–T04  
> **Meta:** auth JWT + refresh rotation + logout + guards  
> **Capacidade:** 8 pts

---

## US-USR-001 — API de autenticação JWT

**Agregado(s):** User  
**Superfície(s):** `apps/api`, `packages/shared`

### Tasks técnicas

| Task | Descrição | Est. | Dep. | Superfície |
|------|-----------|------|------|------------|
| **T05** | Migration `users` + seed admin (`ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`) | 2 | T04 | api |
| **T06** | `user/domain`: entity, `UserRole`, erros domínio; helper `canAccess(role, required)` — ADR-004 | 2 | T02, T05 | api |
| **T07** | `user/application`: `LoginUseCase`, `RefreshTokenUseCase`, `LogoutUseCase` | 3 | T06 | api |
| **T08** | `user/infra`: `UserRepository`, `RefreshTokenStore` (Valkey), `JwtService` | 3 | T07 | api |
| **T09** | `user/http`: rotas `/v1/auth/*`, schemas Fastify, `authenticate` + `requireRole('admin')` | 3 | T08 | api |
| **T10** | Rota stub `GET /v1/me` para validar guard; README curl de teste manual | 1 | T09 | api |

### Ordem de execução

```
T05 → T06 → T07 → T08 → T09 → T10
```

### Pontuação total: 14 pts → **executar em 2 blocos**

| Bloco | Tasks | pts | Meta |
|-------|-------|-----|------|
| A | T05 → T07 | 7 | login retorna JWT |
| B | T08 → T10 | 7 | refresh rotation + logout |

### Riscos

- Cookie `Secure` em localhost — usar `Secure=false` + `SameSite=Lax` em dev via env

### DoR

- [x] T01–T04 concluídos
- [x] Valkey rodando (T03)

### Próximo passo

Após T10 → [iter-02-video-backend.md](./iter-02-video-backend.md)
