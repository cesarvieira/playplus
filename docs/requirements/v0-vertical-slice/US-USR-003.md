# US-USR-003 — Login viewer na web

**Como** Viewer registrado (mesmo dono do projeto)  
**Quero** fazer login na interface pública  
**Para** acessar o catálogo privado e reproduzir vídeos

**Pilar:** Privacidade  
**Agregado(s):** User  
**Superfície:** `apps/web`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — reprodução web; critério de sucesso #3

## Critérios de Aceite

- [ ] Dado que não estou autenticado, quando acesso catálogo (`/`) ou página de vídeo (`/[id]`), então sou redirecionado para `/login?redirect=<rota-original>`
- [ ] Dado credenciais válidas do usuário seed, quando submeto o formulário de login, então sou autenticado e redirecionado para `/` (ou para `redirect` se presente e válido)
- [ ] Dado login bem-sucedido, quando inspeciono o cliente, então `access_token` está em memória (não em `localStorage`) e requisições subsequentes enviam header `Authorization`
- [ ] Dado credenciais inválidas, quando submeto login, então vejo a mensagem *"E-mail ou senha incorretos."* — sem revelar qual campo falhou
- [ ] Dado body inválido no login, quando submeto formulário incompleto ou malformado, então vejo mensagens de validação por campo (`VALIDATION_ERROR`)
- [ ] Dado sessão ativa, quando clico em logout no header, então `POST /auth/logout` é chamado, tokens são limpos e retorno à tela de login — catálogo e player ficam inacessíveis
- [ ] Dado `access_token` expirado durante navegação, quando uma requisição falha com 401, então o cliente tenta refresh automático antes de redirecionar ao login
- [ ] Dado refresh inválido ou expirado (`INVALID_TOKEN`), quando o refresh falha, então sou redirecionado para `/login?reason=session_expired` e vejo *"Sua sessão expirou. Faça login novamente."*
- [ ] Dado submit em andamento, quando aguardo resposta do login, então botão e campos ficam desabilitados até concluir (evita duplo submit)
- [ ] Dado usuário autenticado como admin no seed, quando faço login na web, então consigo acessar catálogo viewer (role compatível com consumo)

## Copy de UI (erros tipados)

| Situação | Código API | Mensagem |
|----------|------------|----------|
| Credenciais inválidas | `UNAUTHORIZED` | E-mail ou senha incorretos. |
| Sessão expirada (refresh falhou) | `INVALID_TOKEN` | Sua sessão expirou. Faça login novamente. |
| Validação de formulário | `VALIDATION_ERROR` | Mensagem por campo (ex.: *"Informe um e-mail válido."*) |

## Requisitos Não-Funcionais

- Performance: feedback visual de loading no submit em ≤ 100 ms
- Segurança: mesmas regras de US-USR-002 — formulário HTTPS em prod; `autocomplete="email"` no e-mail; `autocomplete="current-password"` na senha
- Acessibilidade (WCAG 2.1 AA): labels visíveis em e-mail e senha; foco visível; submit acionável por teclado; banner de erro com `role="alert"`; campos inválidos com `aria-invalid="true"` e erro ligado via `aria-describedby`; toggle *mostrar senha* com nome acessível; botão logout com texto ou `aria-label="Sair"`; contraste mínimo 4.5:1 em textos do formulário
- Responsividade: layout de login empilha painel lateral e formulário em viewport estreita (mobile e notebooks 13")

## Fora de escopo v0

- Recuperação de senha (*"Esqueceu a senha?"*) — não exibir link ou ação

## Dependências

- US-USR-001 (API auth)

## Riscos

- Modelo de role do usuário único — se seed for apenas `admin`, validar que rotas viewer (`GET /videos`) aceitam admin ou ajustar seed para dual-role documentado

## Referência visual

Mockup: `apps/web/mockups/dc.html` — seção **01 · Login** (padrão, carregando, erro, sessão expirada)
