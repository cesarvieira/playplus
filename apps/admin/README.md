# Play+ Admin

Painel administrativo do Play+ — upload, catálogo e gestão de vídeos.

## Desenvolvimento

```bash
pnpm --filter @playplus/admin dev
```

O app sobe em [http://localhost:3002](http://localhost:3002).

## Variáveis de ambiente

| Variável              | Descrição                 | Default (dev)               |
| --------------------- | ------------------------- | --------------------------- |
| `NUXT_PUBLIC_API_URL` | Base URL da API (`/v1`)   | `http://localhost:3000/v1`  |
| `NUXT_PUBLIC_WS_URL`  | WebSocket da API          | `ws://localhost:3000/v1/ws` |
| `NUXT_PUBLIC_WEB_URL` | Frontend público (viewer) | `http://localhost:3001`     |

Copie a seção Admin do `.env.example` na raiz do monorepo para um `.env` local, se necessário.

## Design

Tokens visuais do tema **Pêssego** espelham o mockup em [`mockups/dc.html`](./mockups/dc.html). O `tailwind.config.ts` é carregado via `@config` em `app/assets/css/main.css` (Tailwind CSS 4).

**Guia obrigatório para UI (humanos e IA):** [`docs/theme.md`](./docs/theme.md)

O módulo `@nuxtjs/tailwindcss` está na versão `7.0.0-beta.1` para compatibilidade com Tailwind 4.

Classes Tailwind customizadas incluem `bg-peach-page`, `bg-status-ready`, `rounded-pl-md`, `text-pl-sm` e classes compostas `pl-page-title`, `pl-dropzone`, `pl-toast-host`.

## Dependências

- [`@playplus/shared`](../../packages/shared) — contratos compartilhados (tipos, enums, erros)
- Nenhum import de `apps/api`, `apps/web` ou `packages/worker`
