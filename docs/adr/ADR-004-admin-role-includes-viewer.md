# ADR-004: Role admin inclui permissões viewer

**Data:** 2026-06-18  
**Status:** Aceito

## Contexto

Projeto com **usuário único** (dono = admin + viewer). US-USR-001 cria seed com role admin. US-USR-003 exige login na web para catálogo e player. Rotas viewer (`GET /videos`) exigem autenticação; rotas admin (`POST /videos`) exigem role admin.

## Decisão

Modelo de role **single enum** (`admin` | `viewer`) com **hierarquia implícita**:

- `admin` → acessa rotas admin **e** rotas viewer
- `viewer` → acessa apenas rotas viewer

Implementação no guard de autorização:

```typescript
function canAccess(required: 'admin' | 'viewer', userRole: UserRole): boolean {
  if (required === 'viewer') return true; // qualquer autenticado
  return userRole === 'admin';
}
```

Usuário seed: role `admin`, email/senha via env na migration.

Sem UI de cadastro de viewers no v0.

## Alternativas consideradas

- **Array de roles (`['admin','viewer']`):** flexível para multi-user futuro, overkill para v0 solo — defer
- **Dois usuários seed (admin + viewer):** fricção desnecessária para uma pessoa — rejeitado
- **Rotas viewer públicas sem auth:** viola pilar Privacidade — rejeitado

## Consequências

- **Positivas:** um login serve admin e web; seed simples; compatível com expansão futura (novos viewers com role `viewer`)
- **Negativas:** semântica de "viewer" menos pura em testes — documentar no guard

## Impacto Play+

- **Agregado(s):** User
- **Superfície(s):** `apps/api`, `apps/web`, `apps/admin`, `packages/shared`
- **Contratos:** sem mudança em `docs/api.md`
- **Breaking change:** não

## Revisão em

Quando gestão de múltiplos viewers entrar no escopo — reavaliar RBAC explícito
