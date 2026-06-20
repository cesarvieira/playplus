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

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) 9.x (o projeto usa `packageManager: pnpm@9.15.4`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou Docker Engine + Compose)

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Copie o template e ajuste os valores sensíveis:

```bash
cp .env.example .env
```

Edite `.env` e defina pelo menos `JWT_SECRET` (≥ 32 caracteres) e `ADMIN_SEED_PASSWORD`. O arquivo `.env` não é versionado.

### 3. Subir a infraestrutura local

Na raiz do repositório:

```bash
docker compose up -d
```

Isso sobe **PostgreSQL**, **Valkey** e **MinIO** (com bucket `playplus` criado automaticamente).

Para parar a infra:

```bash
docker compose down
```

### 4. Aplicar migrations do banco (API)

Com PostgreSQL no ar e `.env` configurado na raiz, aplique as migrations Drizzle da API:

```bash
pnpm --filter @playplus/api db:migrate
```

### 5. Rodar o monorepo em desenvolvimento

Com a infra no ar:

```bash
pnpm dev
```

O Turbo executa o script `dev` de cada app/package em paralelo. Nesta fase inicial (`ETD-01`), os apps ainda são stubs — a API, worker, web e admin passam a responder conforme forem implementados nas ETDs seguintes.

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

---

<div align="center">

Feito com curiosidade, algumas noites de código e muito amor por tecnologia. ☕

**Bem-vindo ao Play+.**

</div>
