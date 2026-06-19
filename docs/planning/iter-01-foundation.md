# Iteração 01 — Fundação + Auth API

> **US:** PLAY-US-001, PLAY-US-002, US-USR-001  
> **Meta:** `docker compose up` sobe infra; `POST /auth/login` retorna JWT; rotas protegidas e refresh rotation funcionam via curl  
> **Capacidade:** 8 pts (MVP greenfield)

---

## Épico: Fundação monorepo + autenticação

**Agregado(s):** User (+ contratos Video em shared)  
**Superfície(s):** root, infra Docker, `packages/shared`, `apps/api`

### Tasks técnicas

| Task | Descrição | Est. | Dep. | Superfície |
|------|-----------|------|------|------------|
| **T01** | Scaffold monorepo: `pnpm-workspace.yaml`, `turbo.json`, `package.json` root, `tsconfig.base.json`, scripts `dev`/`build`/`lint` | 2 | — | root |
| **T02** | `packages/shared`: export barrel; enums `UserRole`, `VideoStatus`, `ErrorCode`; tipos `User`, `Video`; DTOs `LoginDto`, `AuthResponseDto`; erros tipados (`UnauthorizedError`, etc.) | 2 | T01 | shared |
| **T03** | `docker-compose.yml`: postgres, valkey, minio (+ bucket init); `.env.example` com `DATABASE_URL`, `VALKEY_URL`, `STORAGE_*`, `JWT_SECRET`, `ADMIN_SEED_*` | 3 | T01 | infra |
| **T04** | `apps/api` scaffold: Fastify + TypeScript, `src/config/env.ts`, plugin postgres (Drizzle ou pg), `GET /v1/health` | 2 | T01, T03 | api |
| **T05** | Migration `users` + seed admin único a partir de env; colunas conforme [architecture.md](../architecture.md) | 2 | T04 | api |
| **T06** | Módulo `user/domain`: entity `User`, value objects; regras role guard (admin ⊃ viewer — ADR-004) | 2 | T02, T05 | api |
| **T07** | Módulo `user/application`: `LoginUseCase`, `RefreshTokenUseCase`, `LogoutUseCase` | 3 | T06 | api |
| **T08** | Módulo `user/infra`: `UserRepository`, `RefreshTokenStore` (Valkey TTL 7d), `JwtService` (access 15min) | 3 | T07 | api |
| **T09** | Módulo `user/http`: rotas `POST /auth/login`, `/refresh`, `/logout`; JSON Schema; middleware `authenticate` + `requireRole` | 3 | T08 | api |
| **T10** | Teste manual documentado: curl login → Bearer em rota protegida → refresh com cookie → logout invalida refresh | 1 | T09 | — |

### Riscos e incertezas

- **Refresh rotation + cookie em dev local:** SameSite/Secure pode exigir HTTPS ou flag relaxada em dev — documentar em `.env.example`
- **ORM vs SQL raw:** escolher Drizzle ou Kysely no T04 e manter consistente (spike 0,5h se indeciso)
- **MinIO no compose:** necessário para iter 2; nesta iter só precisa subir healthy (sem integração api ainda)

### Ordem de execução recomendada

```
T01 → T02 ─┐
T01 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10
```

Paralelo possível após T01: **T02** e **T03** em paralelo.

Sequência crítica: T04 → T05 → T06 → T07 → T08 → T09.

### Pontuação total: 23 pts

**Cabe na iteração?** **Não** — escopo completo da US-USR-001 + infra excede 8 pts.

### Escopo ajustado para 8 pts (entregar nesta iter)

| Task | Incluída | pts |
|------|----------|-----|
| T01 | ✓ | 2 |
| T02 | ✓ | 2 |
| T03 | ✓ (sem nginx — defer ADR-003 para iter 3) | 2 |
| T04 | ✓ | 2 |
| **Subtotal entregue** | | **8** |

### Carryover → Iteração 01b (auth restante, ~8 pts)

| Task | pts |
|------|-----|
| T05 Migration + seed | 2 |
| T06 Domain user + role guard | 2 |
| T07 Application use cases | 3 |
| T08 Infra JWT + Valkey | 3 |
| T09 HTTP routes + middleware | 3 |
| T10 Teste manual | 1 |

> **Nota:** renumerar como T05–T10 na iter-01b ou manter IDs e executar na sequência.

---

## DoR

- [x] Critérios de aceite testáveis (US-USR-001)
- [x] Agregado + superfície mapeados
- [x] UX aprovada — N/A nesta iter (sem frontend)
- [x] Contratos em `docs/api.md` (auth)
- [x] Arquitetura aprovada (ADR-001, ADR-004)
- [x] Sem red flags

---

## Checklist de saída (iter 01 — escopo 8 pts)

- [ ] `pnpm install` na raiz resolve workspaces
- [ ] `docker compose up -d` sobe postgres, valkey, minio healthy
- [ ] `packages/shared` exporta tipos sem dependências externas
- [ ] `GET /v1/health` retorna 200
- [ ] `.env.example` documentado

---

## Teste manual (após iter 01b completa)

```bash
# Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@playplus.local","password":"..."}' \
  -c cookies.txt

# Rota protegida (stub GET /v1/me ou similar)
curl http://localhost:3000/v1/me -H "Authorization: Bearer <token>"

# Refresh
curl -X POST http://localhost:3000/v1/auth/refresh -b cookies.txt -c cookies.txt

# Logout
curl -X POST http://localhost:3000/v1/auth/logout -b cookies.txt
```

---

## Próximo passo

Handoff **`dev-agent`**: executar **T01 → T04** (8 pts).  
Em seguida: iter **01b** (T05–T10) ou documento dedicado antes de iniciar Video backend (iter 02).
