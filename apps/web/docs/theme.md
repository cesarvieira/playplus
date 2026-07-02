# Tema visual — Play+ Web

Guia obrigatório para **agentes de IA e desenvolvedores** que criam ou alteram UI em `apps/web`.

O tema **Night** (escuro fixo) é a fonte única de verdade visual. Mockup de referência: [`mockups/dc.html`](../mockups/dc.html).

## Cadeia de carregamento

```
nuxt.config.ts  →  tailwindcss.cssPath: ~/assets/css/main.css
main.css        →  @import tailwindcss + @config + theme/index.css
theme/index.css →  tokens.css, components.css, motion.css
```

Nunca importe `theme/` diretamente em `.vue`. O bundle já inclui tudo via `main.css`.

Tokens vivem em `@theme` dentro de `tokens.css` (Tailwind 4). O arquivo `tailwind.config.ts` declara apenas `content` — não use `theme.extend` aqui.

## Regras obrigatórias (IA)

Ao criar ou modificar `.vue`, `.css` ou estilos em `apps/web`:

1. **Cores** — use tokens `night-*`, `feedback-*` e `status-*` (`bg-night-canvas`, `text-feedback-error-fg`). **Nunca** hex, `rgb()` ou nomes Tailwind genéricos (`gray-500`, `neutral-500`, `white`, `red-600`) em componentes.
2. **Tipografia** — use escalas `text-pl-*` (`text-pl-sm`, `text-pl-2xl`, `text-pl-hero`). **Evite** `text-sm`, `text-xs`, `text-2xl` e tamanhos arbitrários.
3. **Tracking** — use `tracking-pl-tight` para headlines. **Evite** `tracking-tight` genérico quando o token existir.
4. **Raio, sombra, borda** — use `rounded-pl-*`, `shadow-night-*`, `border-pl` quando aplicável.
5. **Gradientes** — use `bg-hero-login` e `bg-cta-gradient`. **Nunca** gradientes inline em `.vue`.
6. **Tamanhos de ícone/mídia** — use `size-pl-icon`, `size-pl-icon-sm`, `size-pl-icon-md`, `size-pl-media-lg`, `size-pl-media-md`. **Evite** `size-4`, `size-6`, `size-10`, `size-12`.
7. **Z-index** — use `z-pl-modal`, `z-pl-toast`. **Evite** `z-50`, `z-[60]`, `top-20` para posicionamento de overlay.
8. **Padrão repetido (2+ lugares)** — extraia para `app/assets/css/theme/components.css` como classe `pl-*`. **Não** copie blocos longos de utilitários Tailwind entre componentes.
9. **Token novo** — valor repetido ou cor inexistente → adicione em `tokens.css` (`@theme`), não inline no `.vue`.
10. **Focus** — elementos interativos customizados usam a classe `pl-focus-ring` no HTML (não via `@apply` em outra regra CSS — o Tailwind não suporta isso).
11. **Movimento** — spinner e skeleton usam `animate-pl-spin` / `animate-pl-pulse`; `motion.css` respeita `prefers-reduced-motion`.

### O que pode ficar nos `.vue`

Utilitários de **layout estrutural** sem valor visual de marca:

- `flex`, `grid`, `gap-*`, `min-w-0`, `flex-1`, `shrink-0`
- `sr-only`, `text-center`
- Estados condicionais simples (`hidden`, `v-if`)

### Anti-patterns (nunca gerar)

| Evitar                                | Usar em vez disso                                         |
| ------------------------------------- | --------------------------------------------------------- |
| `text-sm` / `text-xs` / `text-2xl`    | `text-pl-sm` / `text-pl-xs` / `text-pl-2xl`               |
| `text-neutral-500`, `text-gray-*`     | `text-night-muted` ou `pl-text-muted`                     |
| `bg-black`, `bg-white`                | `bg-night-canvas`, `bg-night-panel`                       |
| `size-12`, `size-10`, `size-4`        | `size-pl-media-lg`, `size-pl-media-md`, `size-pl-icon-sm` |
| `z-[60]`, `top-20`                    | token `z-pl-toast` ou classe em `components.css`          |
| Hex em `style=""` ou `class`          | Token em `@theme`                                         |
| Bloco visual duplicado em 2+ arquivos | Classe `pl-*` em `components.css`                         |

## Arquivos do tema

| Arquivo          | Responsabilidade                                                  |
| ---------------- | ----------------------------------------------------------------- |
| `tokens.css`     | Cores Night, feedback, tipografia, gradientes, sombras — `@theme` |
| `components.css` | Classes compostas reutilizáveis (`pl-*`)                          |
| `motion.css`     | `prefers-reduced-motion` para spinner/skeleton                    |

## Tokens principais

### Superfície (`night-*`)

| Token            | Uso típico                |
| ---------------- | ------------------------- |
| `night-canvas`   | Fundo da app (`body`)     |
| `night-panel`    | Painéis, modais           |
| `night-surface`  | Header, barras            |
| `night-card`     | Cards do catálogo         |
| `night-input`    | Campos de formulário      |
| `night-skeleton` | Placeholders de loading   |
| `night-text`     | Texto primário            |
| `night-body`     | Parágrafos                |
| `night-muted`    | Texto secundário          |
| `night-accent`   | Destaque pêssego          |
| `night-ink`      | Texto sobre gradiente CTA |

### Feedback (`feedback-*`)

| Token                         | Uso                                        |
| ----------------------------- | ------------------------------------------ |
| `feedback-error-fg/bg/border` | Alertas de erro (login, catálogo, player)  |
| `feedback-info-fg/bg/border`  | Avisos informativos (ex.: sessão expirada) |

### Gradientes

| Classe            | Uso                             |
| ----------------- | ------------------------------- |
| `bg-hero-login`   | Painel lateral do login         |
| `bg-cta-gradient` | Botões primários (Entrar, etc.) |

### Sombras

| Classe               | Uso                       |
| -------------------- | ------------------------- |
| `shadow-night-panel` | Painéis elevados          |
| `shadow-night-card`  | Overlays sobre thumbnails |

## Classes compostas (`components.css`)

| Classe              | Uso                       |
| ------------------- | ------------------------- |
| `pl-focus-ring`     | Outline de foco acessível |
| `pl-text-muted`     | Texto secundário          |
| `pl-feedback-error` | Alerta de erro            |
| `pl-feedback-info`  | Alerta informativo        |
| `pl-skeleton`       | Bloco skeleton animado    |
| `pl-spinner`        | Spinner de loading        |

## Fluxo ao implementar UI nova

```
1. Existe classe pl-* adequada?     → reutilizar
2. É cor/tamanho novo e repetível? → tokens.css
3. É padrão visual em 2+ telas?    → components.css
4. Só layout local?                → utilitários estruturais no .vue
```

## Exemplo

```vue
<!-- ❌ Evitar -->
<h1 class="text-2xl font-extrabold text-neutral-100">Catálogo</h1>
<div style="background: linear-gradient(135deg, #F0B894, #E07E7A)">...</div>

<!-- ✅ Preferir -->
<h1 class="text-pl-2xl font-extrabold tracking-pl-tight text-night-text">Catálogo</h1>
<div class="bg-cta-gradient">...</div>
```

## Checklist (antes de concluir PR/task)

- [ ] Nenhum `text-sm` / `text-xs` / `text-2xl` em arquivos alterados
- [ ] Nenhum hex, `neutral-*` ou cor Tailwind genérica
- [ ] Nenhum `size-N` arbitrário para ícones/thumbs — tokens `size-pl-*`
- [ ] Padrões visuais duplicados extraídos para `components.css`
- [ ] Tokens novos em `tokens.css` (comentário de seção)
- [ ] Spinner/skeleton respeitam `prefers-reduced-motion`

## Referências cruzadas

- [Tema admin](../../admin/docs/theme.md) — padrão arquitetural espelhado (paleta Pêssego vs Night)
- [`AGENTS.md`](../../../AGENTS.md) — regra resumida para todos os agentes
- [`dev-agent/reference.md`](../../../.cursor/skills/dev-agent/reference.md) — padrões de implementação frontend
