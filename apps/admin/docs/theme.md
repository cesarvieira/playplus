# Tema visual — Play+ Admin

Guia obrigatório para **agentes de IA e desenvolvedores** que criam ou alteram UI em `apps/admin`.

O tema **Pêssego** é a fonte única de verdade visual. Mockup de referência: [`mockups/dc.html`](../mockups/dc.html).

## Cadeia de carregamento

```
nuxt.config.ts  →  tailwindcss.cssPath: ~/assets/css/main.css
main.css        →  @import tailwindcss + @config + @source + theme/index.css
theme/index.css →  tokens.css, components.css, motion.css, error.css
```

Nunca importe `theme/` diretamente em `.vue`. O bundle já inclui tudo via `main.css`.

## Regras obrigatórias (IA)

Ao criar ou modificar `.vue`, `.css` ou estilos em `apps/admin`:

1. **Cores** — use tokens `peach-*` e `status-*` (`bg-peach-page`, `text-status-error-fg`). **Nunca** hex, `rgb()` ou nomes Tailwind genéricos (`gray-500`, `white`, `red-600`) em componentes.
2. **Tipografia** — use escalas `text-pl-*` (`text-pl-sm`, `text-pl-2xl`). **Evite** `text-sm`, `text-xs`, `text-2xl` e tamanhos arbitrários.
3. **Raio, sombra, borda** — use `rounded-pl-*`, `shadow-pl-*`, `border-pl` quando aplicável.
4. **Tamanhos de ícone/mídia** — use `size-pl-icon`, `size-pl-icon-sm`, `size-pl-icon-md`, `size-pl-media-lg`, `size-pl-media-md`. **Evite** `size-4`, `size-6`, `size-10`, `size-12`.
5. **Z-index** — use `z-pl-modal`, `z-pl-toast`. **Evite** `z-50`, `z-[60]`, `top-20` para posicionamento de overlay.
6. **Padrão repetido (2+ lugares)** — extraia para `app/assets/css/theme/components.css` como classe `pl-*` (admin geral) ou `ple-*` (páginas de erro). **Não** copie blocos longos de utilitários Tailwind entre componentes.
7. **Token novo** — valor repetido ou cor inexistente → adicione em `tokens.css` (`@theme`), não inline no `.vue`.
8. **Focus** — elementos interativos customizados usam a classe `pl-focus-ring` no HTML (não via `@apply` em outra regra CSS — o Tailwind não suporta isso).
9. **Componentes base** — prefira `PlButton`, `PlInput`, `PlModal`, `PlToast`, etc. antes de estilizar do zero.

### O que pode ficar nos `.vue`

Utilitários de **layout estrutural** sem valor visual de marca:

- `flex`, `grid`, `gap-*`, `min-w-0`, `flex-1`, `shrink-0`
- `sr-only`, `text-center`
- Estados condicionais simples (`hidden`, `v-if`)

### Anti-patterns (nunca gerar)

| Evitar                                | Usar em vez disso                                         |
| ------------------------------------- | --------------------------------------------------------- |
| `text-sm` / `text-xs` / `text-2xl`    | `text-pl-sm` / `text-pl-xs` / `text-pl-2xl`               |
| `text-white`, `border-l-white`        | `text-peach-surface` ou classe em `components.css`        |
| `size-12`, `size-10`, `size-4`        | `size-pl-media-lg`, `size-pl-media-md`, `size-pl-icon-sm` |
| `z-[60]`, `top-20`                    | `pl-toast-host` ou token `z-pl-toast`                     |
| `border-y-[6px] border-l-[10px]`      | `pl-play-glyph` ou token em `tokens.css`                  |
| Hex em `style=""` ou `class`          | Token em `@theme`                                         |
| Bloco visual duplicado em 2+ arquivos | Classe `pl-*` em `components.css`                         |

## Arquivos do tema

| Arquivo          | Responsabilidade                                                      |
| ---------------- | --------------------------------------------------------------------- |
| `tokens.css`     | Cores, tipografia, raios, sombras, z-index, tamanhos — bloco `@theme` |
| `components.css` | Classes compostas reutilizáveis (`pl-*`, `ple-*`)                     |
| `motion.css`     | Transições e animações nomeadas (ex.: toast)                          |
| `error.css`      | Estilos específicos das telas de erro                                 |

## Classes compostas (`components.css`)

### Admin geral (`pl-*`)

| Classe                                             | Uso                                                   |
| -------------------------------------------------- | ----------------------------------------------------- |
| `pl-focus-ring`                                    | Outline de foco acessível                             |
| `pl-page-section`                                  | Container de página (`max-w-xl`)                      |
| `pl-page-title`                                    | Título de página                                      |
| `pl-page-lead`                                     | Subtítulo / lead                                      |
| `pl-back-link`                                     | Link “voltar”                                         |
| `pl-text-error`                                    | Mensagem de erro inline                               |
| `pl-text-muted`                                    | Texto secundário                                      |
| `pl-text-meta`                                     | Metadados (bytes, contadores)                         |
| `pl-dropzone` / `pl-dropzone--active`              | Área de upload                                        |
| `pl-file-chip`                                     | Arquivo selecionado                                   |
| `pl-media-thumb` / `pl-play-glyph`                 | Preview de mídia no modal                             |
| `pl-modal-*`                                       | Blocos do modal de upload                             |
| `pl-upload-notice`                                 | Aviso informativo no upload                           |
| `pl-toast-host` / `pl-toast` / `pl-toast--*`       | Notificações toast                                    |
| `pl-publication-badge` / `pl-publication-badge--*` | Badge de publicação (Rascunho / Agendado / Publicado) |
| `pl-video-row-menu` / `pl-video-row-menu__item`    | Menu de ações de publicação na linha do vídeo         |

### Páginas de erro (`ple-*`)

Prefixo `ple-` (error **e**): `ple-headline`, `ple-btn`, `ple-dev-panel`, etc. Usar somente em `ErrorScreen` e componentes `error/`.

## Fluxo ao implementar UI nova

```
1. Existe classe pl-* ou componente Pl* adequado?  → reutilizar
2. É cor/tamanho novo e repetível?                 → tokens.css
3. É padrão visual em 2+ telas?                  → components.css
4. Só layout local?                              → utilitários estruturais no .vue
```

## Exemplo

```vue
<!-- ❌ Evitar -->
<h1 class="text-2xl font-extrabold text-peach-ink">Novo vídeo</h1>
<div class="fixed top-20 right-4 z-[60]">...</div>

<!-- ✅ Preferir -->
<h1 class="pl-page-title">Novo vídeo</h1>
<div class="pl-toast-host">...</div>
```

## Checklist (antes de concluir PR/task)

- [ ] Nenhum `text-sm` / `text-xs` / `text-2xl` em arquivos alterados
- [ ] Nenhum hex ou cor Tailwind genérica
- [ ] Nenhum `size-N` arbitrário para ícones/thumbs — tokens `size-pl-*`
- [ ] Padrões visuais duplicados extraídos para `components.css`
- [ ] Tokens novos documentados implicitamente em `tokens.css` (comentário de seção)
- [ ] Componentes `Pl*` usados quando couber

## Referências cruzadas

- [README do admin](../README.md) — setup e variáveis
- [`AGENTS.md`](../../../AGENTS.md) — regra resumida para todos os agentes
- [`dev-agent/reference.md`](../../../.cursor/skills/dev-agent/reference.md) — padrões de implementação frontend
