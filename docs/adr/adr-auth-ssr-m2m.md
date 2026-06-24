# ADR — autenticação SSR + M2M com token rotation

**Projeto:** `@playplus/api` + `admin.playplus.com.br`
**Status:** decidido
**Data:** junho 2026

---

## contexto

O sistema tem dois domínios distintos:

- `admin.playplus.com.br` — frontend SSR (Next/Nuxt)
- `api.playplus.com.br` — API REST

O SSR precisa fazer chamadas autenticadas à API durante o render, para popular telas antes de devolver HTML ao browser. O browser também faz chamadas diretas à API após a hidratação.

A pergunta central foi: **quem carrega o token do usuário, e como ele trafega com segurança entre esses domínios?**

---

## decisão

**O token do usuário nunca cruza o domínio do SSR para a API.**

O SSR autentica na API com credencial própria (M2M) e delega apenas a identidade do usuário via header assinado. O cookie de sessão do usuário é exclusivo do domínio do SSR.

---

## arquitetura de tokens

### cookies emitidos no login

```
Set-Cookie: access_token=<JWT>;
  HttpOnly; Secure; SameSite=Lax;
  Path=/;
  Domain=admin.playplus.com.br;
  Max-Age=900

Set-Cookie: refresh_token=<opaque>;
  HttpOnly; Secure; SameSite=None;
  Path=/auth/refresh;
  Domain=api.playplus.com.br;
  Max-Age=604800
```

**Por que `SameSite=Lax` no access_token?**
Ele só trafega entre browser e SSR — mesmo domínio, sem cross-origin. `Lax` é suficiente e mais restritivo.

**Por que `SameSite=None` no refresh_token?**
O browser precisa chamar `POST /auth/refresh` direto na API (`api.playplus.com.br`), que é um domínio diferente. `SameSite=None` é obrigatório para cookies cross-origin. Exige `Secure`.

**Por que `Path=/auth/refresh` no refresh_token?**
O cookie só trafega para esse endpoint específico. O resto da API nunca o vê — nem por acidente, nem por bug.

---

## fluxo de autenticação

### 1. login

```
Browser → POST /auth/login → Auth API
Auth API → set-cookie: access_token + refresh_token
```

### 2. render SSR (token válido)

```
Browser → GET /pagina (cookie access_token automático) → SSR
SSR extrai userId do access_token (lê, não repassa)
SSR → GET /api/dados
      Authorization: Bearer <SSR-credential>
      X-User-Id: <JWT assinado com secret M2M>
API valida credencial do SSR + identidade do usuário
API → dados
SSR → HTML renderizado
```

### 3. render SSR (token expirado)

```
Browser → GET /pagina → SSR
SSR detecta access_token expirado
SSR → POST /auth/refresh (refresh_token via cookie)
Auth API → novo access_token + novo refresh_token (rotation)
SSR → GET /api/dados (com novo token)
SSR → HTML + set-cookie (novos tokens propagados ao browser)
```

O browser recebe a página e os tokens já renovados num único response. Nunca soube que houve refresh.

### 4. refresh client-side

```
Browser → GET /api/dados → 401
Browser → POST /auth/refresh (cookie automático, cross-origin)
Auth API → set-cookie: novos tokens (rotation)
Browser → retry GET /api/dados → 200
```

### 5. race condition (fila de promises)

Múltiplas requests recebendo 401 simultaneamente:

```
A → 401 → isRefreshing = false → inicia refresh, isRefreshing = true
B → 401 → isRefreshing = true  → entra na fila
C → 401 → isRefreshing = true  → entra na fila

refresh resolve →
  isRefreshing = false
  flush da fila: B e C retentam com novo token
```

Implementação mínima: uma flag booleana + array de resolve functions. Sem biblioteca.

### 6. logout

```
Browser → POST /auth/logout
Auth API → revoga refresh_token no banco
Auth API → set-cookie: access_token=; Max-Age=0
           set-cookie: refresh_token=; Max-Age=0
Browser → redirect /login
```

**Por que revogar server-side?**
Cookie apagado no browser não invalida o token no servidor. Um refresh_token vazado (cookie roubado) continuaria funcional após logout sem revogação server-side.

---

## segurança — superfícies e defesas

| vetor                   | defesa                                                        | status                   |
| ----------------------- | ------------------------------------------------------------- | ------------------------ |
| XSS acessa cookie       | `HttpOnly`                                                    | bloqueado                |
| CSRF via iframe/fetch   | `CORS` restrito + `SameSite`                                  | bloqueado                |
| CSRF via form HTML      | `Content-Type: application/json` (forms não conseguem enviar) | impossível               |
| refresh_token vazado    | rotation — segundo uso invalida a sessão                      | detectado                |
| token do usuário na API | nunca trafega — SSR usa M2M                                   | eliminado por design     |
| logout sem revogação    | revogação server-side obrigatória                             | coberto                  |
| XSS no próprio SSR      | CSP + sanitização de input                                    | fora do escopo deste ADR |

### por que `Content-Type: application/json` fecha o vetor de CSRF via form?

Formulários HTML nativos só conseguem enviar `application/x-www-form-urlencoded`, `multipart/form-data` ou `text/plain`. Não conseguem enviar JSON. Logo, um form malicioso em `evil.com` não consegue fazer um request válido para os endpoints da API — que exigem JSON. O browser bloqueia o preflight CORS antes mesmo de o request sair.

---

## CORS — configuração cirúrgica

Só os endpoints de auth cross-origin precisam de CORS com credentials:

```
Access-Control-Allow-Origin: https://admin.playplus.com.br
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type, Authorization
```

Rotas: `/v1/auth/login` · `/v1/auth/refresh` · `/v1/auth/logout`

Nenhum outro endpoint da API precisa de `Allow-Credentials: true`.

---

## identidade delegada (X-User-Id)

O header `X-User-Id` que o SSR envia para a API não pode ser texto puro — qualquer SSR comprometido poderia forjar qualquer userId.

A solução: um JWT de vida curta, assinado com um secret compartilhado entre SSR e API.

```json
{
  "sub": "user-uuid",
  "iat": 1234567890,
  "exp": 1234567950
}
```

A API valida a assinatura antes de confiar no userId. Dois níveis de verificação:

1. O canal é confiável? (credencial M2M válida)
2. A identidade é válida? (JWT de delegação assinado)

---

## ambiente de desenvolvimento

HTTPS local via `mkcert` para paridade total com produção.

**Por quê?** `SameSite=None` exige `Secure`, que exige HTTPS. Sem isso, o cookie de refresh não funciona em dev — e você descobre em produção. A ironia de um bug de autenticação que só aparece quando tem usuário real é insuportável.

```bash
mkcert -install
mkcert localhost 127.0.0.1
```

Configurar SSR e API com os certificados gerados. Sem proxy, sem gambiarras — mesmo comportamento de produção.

---

## o que este ADR não cobre

- Rotação de credencial M2M (SSR-credential)
- Rate limiting no endpoint de refresh
- Blacklist de refresh tokens revogados (vs. whitelist)
- Multi-device logout (revogar todas as sessões)
- CSP e proteção contra XSS no SSR

Implementado fora deste ADR: [`nuxt-security`](../../apps/admin/nuxt.config.ts) no admin (Ciclo 3).

---

## alternativas consideradas e descartadas

**SSR repassa o token do usuário para a API**
Descartado. O token do usuário vaza para dentro da infraestrutura. Se o SSR for comprometido, o atacante tem acesso a tokens individuais de cada usuário — persistentes até expiração.

**SSR como proxy de todas as chamadas de API**
Descartado. Latência extra em todo request de cliente. O SSR vira gargalo. O ganho de segurança (eliminar CORS) não justifica o custo em performance.

**localStorage para tokens**
Descartado imediatamente. XSS acessa localStorage. HttpOnly existe exatamente para isso.
