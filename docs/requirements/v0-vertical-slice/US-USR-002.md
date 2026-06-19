# US-USR-002 — Login administrativo

**Como** Admin/Dono  
**Quero** fazer login na interface administrativa  
**Para** acessar upload e gestão de vídeos sem expor credenciais em rotas abertas

**Pilar:** Privacidade  
**Agregado(s):** User  
**Superfície:** `apps/admin`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — fluxo admin primeiro; critério de sucesso #1

## Critérios de Aceite

- [ ] Dado que não estou autenticado, quando acesso qualquer rota admin protegida, então sou redirecionado para `/login`
- [ ] Dado credenciais válidas na tela de login, quando submeto o formulário, então sou autenticado e redirecionado ao dashboard ou listagem de vídeos
- [ ] Dado login bem-sucedido, quando inspeciono o cliente, então `access_token` está em memória (não em `localStorage`) e requisições subsequentes enviam header `Authorization`
- [ ] Dado credenciais inválidas, quando submeto login, então vejo mensagem de erro clara sem revelar se email ou senha está incorreto
- [ ] Dado sessão ativa, quando clico em logout, então `POST /auth/logout` é chamado, tokens são limpos e retorno à tela de login
- [ ] Dado `access_token` expirado durante navegação, quando uma requisição falha com 401, então o cliente tenta refresh automático antes de redirecionar ao login

## Requisitos Não-Funcionais

- Performance: feedback visual de loading no submit em ≤ 100 ms
- Segurança: formulário HTTPS em prod; campos password com `autocomplete="current-password"`
- Acessibilidade: labels visíveis em email e senha; foco visível; submit acionável por teclado (WCAG 2.1 AA)

## Dependências

- US-USR-001 (API auth)

## Riscos

- Nenhum significativo — US de escopo pequeno/médio
