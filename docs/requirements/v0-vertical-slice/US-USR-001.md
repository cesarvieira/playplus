# US-USR-001 — API de autenticação JWT com refresh rotation

**Como** Admin/Dono  
**Quero** autenticar via API com tokens de curta e longa duração  
**Para** acessar rotas protegidas no admin e na web com sessão segura

**Pilar:** Privacidade  
**Agregado(s):** User  
**Superfície:** `apps/api`, `packages/shared`  
**Rastreabilidade:** Strategy Agent — auth mínima pré-requisito do fluxo admin; Business Case critério #1

## Critérios de Aceite

- [ ] Dado credenciais válidas do usuário seed (admin), quando chamo `POST /auth/login`, então recebo `access_token` e `expires_in: 900` no body e `refresh_token` em cookie `httpOnly; Secure; SameSite=Strict`
- [ ] Dado um `access_token` válido, quando chamo rota protegida com `Authorization: Bearer <token>`, então a requisição é autorizada
- [ ] Dado token ausente ou inválido, quando chamo rota protegida, então recebo `401` com código `UNAUTHORIZED`
- [ ] Dado `access_token` expirado e cookie `refresh_token` válido, quando chamo `POST /auth/refresh`, então recebo novo `access_token` e novo `refresh_token` (rotation) e o token anterior é invalidado no Valkey
- [ ] Dado sessão ativa, quando chamo `POST /auth/logout`, então recebo `204`, o refresh é removido do Valkey e o cookie é limpo
- [ ] Dado usuário com role admin, quando acesso rota marcada 🔒 admin, então sou autorizado; dado role viewer, então recebo `403 FORBIDDEN`
- [ ] Dado ambiente de dev, quando a API sobe, então existe usuário seed único (admin) criado por migration ou script — sem UI de cadastro de viewers

## Requisitos Não-Funcionais

- Performance: login responde em ≤ 500 ms em dev local
- Segurança: `access_token` TTL 15 min; refresh TTL 7 dias com rotation; senha armazenada com hash (bcrypt ou argon2)
- Acessibilidade: n/a (API)

## Dependências

- PLAY-US-001 (postgres, valkey)
- PLAY-US-002 (tipos User, UserRole, erros de auth)

## Riscos

- Usuário único com role admin precisa também acessar `apps/web` — confirmar que admin pode autenticar na web ou que o seed tem permissão viewer+admin conforme modelo de roles
