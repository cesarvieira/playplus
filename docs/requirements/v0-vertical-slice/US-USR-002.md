# US-USR-002 — Login administrativo

**Como** Admin/Dono  
**Quero** fazer login na interface administrativa  
**Para** acessar upload e gestão de vídeos sem expor credenciais em rotas abertas

**Pilar:** Privacidade  
**Agregado(s):** User  
**Superfície:** `apps/admin`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — fluxo admin primeiro; critério de sucesso #1

## Critérios de Aceite

- [ ] Dado que não estou autenticado, quando acesso qualquer rota admin protegida, então sou redirecionado para `/login?redirect=<rota-original>`
- [ ] Dado credenciais válidas na tela de login, quando submeto o formulário, então sou autenticado e redirecionado para `/videos` (ou para `redirect` se presente e válido)
- [ ] Dado login bem-sucedido, quando inspeciono o cliente, então `access_token` está em memória (não em `localStorage`) e requisições subsequentes enviam header `Authorization`
- [ ] Dado credenciais inválidas, quando submeto login, então vejo a mensagem *"E-mail ou senha incorretos."* — sem revelar qual campo falhou
- [ ] Dado body inválido no login, quando submeto formulário incompleto ou malformado, então vejo mensagens de validação por campo (`VALIDATION_ERROR`)
- [ ] Dado sessão ativa, quando clico em logout no header, então `POST /auth/logout` é chamado, tokens são limpos e retorno à tela de login
- [ ] Dado `access_token` expirado durante navegação, quando uma requisição falha com 401, então o cliente tenta refresh automático antes de redirecionar ao login
- [ ] Dado refresh inválido ou expirado (`INVALID_TOKEN`), quando o refresh falha, então sou redirecionado para `/login?reason=session_expired` e vejo *"Sua sessão expirou. Faça login novamente."*
- [ ] Dado submit em andamento, quando aguardo resposta do login, então botão e campos ficam desabilitados até concluir (evita duplo submit)

## Copy de UI (erros tipados)

| Situação | Código API | Mensagem |
|----------|------------|----------|
| Credenciais inválidas | `UNAUTHORIZED` | E-mail ou senha incorretos. |
| Sessão expirada (refresh falhou) | `INVALID_TOKEN` | Sua sessão expirou. Faça login novamente. |
| Validação de formulário | `VALIDATION_ERROR` | Mensagem por campo (ex.: *"Informe um e-mail válido."*) |

## Requisitos Não-Funcionais

- Performance: feedback visual de loading no submit em ≤ 100 ms
- Segurança: formulário HTTPS em prod; `autocomplete="email"` no e-mail; `autocomplete="current-password"` na senha
- Acessibilidade (WCAG 2.1 AA): labels visíveis em e-mail e senha; foco visível; submit acionável por teclado; banner de erro com `role="alert"`; campos inválidos com `aria-invalid="true"` e erro ligado via `aria-describedby`; toggle *mostrar senha* com nome acessível; botão logout com texto ou `aria-label="Sair"`; contraste mínimo 4.5:1 em textos do formulário

## Fora de escopo v0

- Recuperação de senha (*"Esqueceu a senha?"*) — não exibir link ou ação

## Dependências

- US-USR-001 (API auth)

## Riscos

- Nenhum significativo — US de escopo pequeno/médio

## Referência visual

Mockup: `apps/admin/mockups/dc.html` — seção **01 · Login** (padrão, carregando, erro, sessão expirada)
