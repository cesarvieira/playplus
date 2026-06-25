# ✨ Play+

<div align="center">

### Um cantinho especial para guardar histórias.

Filmes, séries e momentos reunidos em um único lugar. 🎬

</div>

## 🌙 Sobre o projeto

Play+ nasceu de uma ideia simples:

Criar um espaço privado, bonito e confortável para guardar aquilo que queremos assistir, revisitar e lembrar.

Não é sobre ter milhares de títulos.
Não é sobre competir com grandes plataformas.

É sobre criar uma experiência tranquila, pessoal e feita para quem valoriza suas próprias histórias. ✨

## 🎞️ Uma nova forma de assistir

Com o Play+, cada filme e cada episódio encontra seu lugar.

Você pode começar uma história hoje, parar quando precisar e voltar depois exatamente de onde parou.

Porque boas histórias não precisam ser apressadas. 💙

## 🏡 Feito para ser pessoal

Este projeto nasceu como um laboratório de aprendizado, curiosidade e criatividade.

Um espaço para explorar ideias, construir algo do zero e transformar uma pequena vontade em algo real.

Um projeto pessoal, feito com cuidado.

## ✨ O que o Play+ representa

🎬 Histórias organizadas
🌙 Experiências simples
🔒 Privacidade
💙 Liberdade
🚀 Aprendizado contínuo

## 🚀 Como iniciar o projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) ≥ 24
- [pnpm](https://pnpm.io/) 9.x (o projeto usa `packageManager: pnpm@9.15.4`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou Docker Engine + Compose)
- **FFmpeg** — obrigatório para o worker de transcodificação HLS (roda no host, não no Docker Compose atual)

| SO                    | Comando                   |
| --------------------- | ------------------------- |
| Windows (Scoop)       | `scoop install ffmpeg`    |
| Windows (Chocolatey)  | `choco install ffmpeg`    |
| macOS (Homebrew)      | `brew install ffmpeg`     |
| Linux (Debian/Ubuntu) | `sudo apt install ffmpeg` |

Confirme com `ffmpeg -version` antes de subir o worker. Caminho customizado: `FFMPEG_PATH` no `.env` (opcional; default `ffmpeg` no PATH).

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Copie o template e ajuste os valores sensíveis:

```bash
cp .env.example .env
```

Edite `.env` e defina pelo menos `JWT_SECRET` (≥ 32 caracteres), `M2M_SERVICE_TOKEN`, `DELEGATION_JWT_SECRET` e `ADMIN_SEED_PASSWORD`. O arquivo `.env` não é versionado.

### 3. HTTPS local com mkcert (auth cross-origin do admin)

O refresh token usa `SameSite=None; Secure` — só funciona com **HTTPS** em dev. Necessário para testar o [ADR-006](docs/adr/adr-auth-ssr-m2m.md) localmente.

**3.1. Instalar o mkcert**

| SO                   | Comando                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| Windows (Chocolatey) | `choco install mkcert`                                                                 |
| Windows (Scoop)      | `scoop bucket add extras && scoop install mkcert`                                      |
| macOS (Homebrew)     | `brew install mkcert`                                                                  |
| Linux                | [Instruções no repositório mkcert](https://github.com/FiloSottile/mkcert#installation) |

**3.2. Instalar a CA local**

```bash
mkcert -install
```

Confirme o prompt do sistema. O browser passará a confiar nos certificados gerados.

**3.3. Configurar hosts locais**

Edite `C:\Windows\System32\drivers\etc\hosts` (Windows, como administrador) ou `/etc/hosts` (macOS/Linux):

```text
127.0.0.1 admin.playplus.localhost api.playplus.localhost storage.playplus.localhost web.playplus.localhost
```

**3.4. Gerar certificados**

Na raiz do repositório:

```bash
mkdir certs
mkcert -cert-file certs/playplus.pem -key-file certs/playplus-key.pem admin.playplus.localhost api.playplus.localhost storage.playplus.localhost web.playplus.localhost minio localhost 127.0.0.1
```

A pasta `certs/` não é versionada (`.gitignore`).

**3.5. Ajustar `.env` para HTTPS**

Descomente e configure no `.env`:

```env
DEV_TLS_CERT=certs/playplus.pem
DEV_TLS_KEY=certs/playplus-key.pem
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=api.playplus.localhost
CORS_ADMIN_ORIGIN=https://admin.playplus.localhost:3002
STORAGE_ENDPOINT=https://storage.playplus.localhost:9000
NUXT_PUBLIC_API_URL=https://api.playplus.localhost:3000/v1
NUXT_PUBLIC_WS_URL=wss://api.playplus.localhost:3000/v1/ws
NUXT_PUBLIC_WEB_URL=https://web.playplus.localhost:3001
```

O MinIO serve HTTPS diretamente na porta **9000** com os certificados mkcert (`certs/playplus.pem` montados no container). Requer `mkcert -install` no host para que API e worker confiem no certificado (`--use-system-ca`).

**3.6. Subir com HTTPS**

```bash
docker compose up -d
pnpm dev
```

URLs esperadas:

- Web (viewer): `https://web.playplus.localhost:3001`
- Admin: `https://admin.playplus.localhost:3002`
- API: `https://api.playplus.localhost:3000/v1`
- Storage: `https://storage.playplus.localhost:9000`

**3.7. Verificar**

- Cadeado válido no browser (sem aviso de certificado)
- DevTools → Application → Cookies: `refresh_token` em `api.playplus.localhost` após login

Para desenvolvimento rápido sem cross-origin, `pnpm dev` com HTTP e as variáveis padrão do `.env.example` ainda funciona.

### 4. Subir a infraestrutura local

Na raiz do repositório:

```bash
docker compose up -d
```

Isso sobe **PostgreSQL**, **Valkey** e **MinIO** (com bucket `playplus` criado automaticamente).

Para parar a infra:

```bash
docker compose down
```

### 5. Aplicar migrations do banco (API)

Com PostgreSQL no ar e `.env` configurado na raiz, aplique as migrations Drizzle da API:

```bash
pnpm db:migrate
```

### 6. Rodar o monorepo em desenvolvimento

Com a infra no ar:

```bash
pnpm dev          # HTTP — localhost
```

O Turbo executa o script `dev` de cada app/package em paralelo — **API**, **worker** (fila BullMQ + FFmpeg HLS), web e admin.

URLs HTTP em dev:

- Web (viewer): `http://localhost:3001` — `pnpm --filter @playplus/web dev`
- Admin: `http://localhost:3002` — `pnpm --filter @playplus/admin dev`

Ordem recomendada: infra Docker → migrations → FFmpeg instalado → `pnpm dev`. O worker conecta PostgreSQL, Valkey e MinIO via `.env` (localhost), valida FFmpeg no startup e consome jobs `video.transcode`.

Para subir apenas o worker:

```bash
pnpm --filter @playplus/worker dev
```

### Comandos úteis

```bash
pnpm lint          # ESLint em todo o monorepo
pnpm typecheck     # TypeScript (tsc --noEmit)
pnpm test          # Vitest
pnpm knip          # exports e dependências não utilizadas
pnpm build         # build de todos os packages
```

## 📚 Documentação

- [Stack e decisões técnicas](docs/stack.md)
- [Estrutura de pastas](docs/folder-structure.md)
- [Contratos da API](docs/api.md)
- [ADR-006 — Auth SSR + M2M](docs/adr/adr-auth-ssr-m2m.md)
- [Checklist E2E auth (ADR-006)](docs/checklist-auth-ssr-m2m.md)

---

## Rotação manual — `M2M_SERVICE_TOKEN`

Procedimento **Opção A** (manual, sem dual-token). Execute também rotação de `DELEGATION_JWT_SECRET` se houver suspeita de vazamento dos dois secrets juntos.

### Quando rotacionar

- Token exposto em log, backup de `.env`, CI ou repositório
- Incidente de segurança no host do admin
- Rotação periódica de boa higiene (opcional, projeto pessoal)

### Passos

1. **Gerar novos valores** (≥ 32 caracteres cada):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Repita para `M2M_SERVICE_TOKEN` e, se necessário, `DELEGATION_JWT_SECRET`.

2. **Atualizar `.env`** na raiz (API e admin leem o mesmo arquivo em dev):

   ```env
   M2M_SERVICE_TOKEN=<novo>
   DELEGATION_JWT_SECRET=<novo-se-aplicável>
   ```

3. **Produção:** atualizar secrets no host/container do **admin** e da **API** — ambos devem coincidir.

4. **Reiniciar processos** — API e admin Nitro carregam env na subida:

   ```bash
   # dev: parar e subir de novo
   pnpm dev
   ```

5. **Validar** — checklist item 2 e 7 em [docs/checklist-auth-ssr-m2m.md](docs/checklist-auth-ssr-m2m.md):
   - SSR `/videos` renderiza com dados (M2M OK)
   - `X-User-Id` forjado com M2M antigo → `401`

### Notas

- Usuários logados **não** precisam relogar — rotação M2M afeta só chamadas SSR→API.
- Se apenas `M2M` vazar (sem `DELEGATION_JWT_SECRET`), risco reduzido — atacante não forja identidade.
- SSR comprometido (RCE): rotação isolada não basta — tratar como incidente de host.

---

<div align="center">

Feito com curiosidade, algumas noites de código e muito amor por tecnologia. ☕

**Bem-vindo ao Play+.**

</div>
