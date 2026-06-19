# US-USR-003 — Login viewer na web

**Como** Viewer registrado (mesmo dono do projeto)  
**Quero** fazer login na interface pública  
**Para** acessar o catálogo privado e reproduzir vídeos

**Pilar:** Privacidade  
**Agregado(s):** User  
**Superfície:** `apps/web`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — reprodução web; critério de sucesso #3

## Critérios de Aceite

- [ ] Dado que não estou autenticado, quando acesso catálogo ou página de vídeo, então sou redirecionado para `/login`
- [ ] Dado credenciais válidas do usuário seed, quando faço login na web, então acesso o catálogo autenticado
- [ ] Dado login bem-sucedido, quando inspeciono o cliente, então `access_token` está em memória e refresh usa cookie httpOnly automaticamente
- [ ] Dado sessão ativa, quando faço logout, então tokens são limpos e catálogo fica inacessível
- [ ] Dado usuário autenticado como admin no seed, quando faço login na web, então consigo acessar catálogo viewer (role compatível com consumo)

## Requisitos Não-Funcionais

- Performance: login responde com feedback visual imediato
- Segurança: mesmas regras de US-USR-002
- Acessibilidade: labels, foco visível e navegação por teclado no formulário de login

## Dependências

- US-USR-001 (API auth)

## Riscos

- Modelo de role do usuário único — se seed for apenas `admin`, validar que rotas viewer (`GET /videos`) aceitam admin ou ajustar seed para dual-role documentado
