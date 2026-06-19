# US-VID-008 — Catálogo de vídeos prontos na web

**Como** Viewer registrado  
**Quero** ver a lista de vídeos disponíveis para assistir  
**Para** escolher o que reproduzir no meu espaço privado

**Pilar:** Histórias organizadas  
**Agregado(s):** Video  
**Superfície:** `apps/web`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério #3; Problem Statement — reunir filmes fora de plataformas comerciais

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | `pages/index.vue` | Catálogo — home autenticada |
| `/[id]` | `pages/[id].vue` | Detalhe/reprodução (US-VID-009) |

## Critérios de Aceite

- [ ] Dado que estou autenticado na web, quando acesso `/`, então vejo grid de vídeos carregados via `GET /videos?status=ready&page=1&limit=20`
- [ ] Dado catálogo carregado, quando clico em um vídeo, então navego para `/[id]` via `<NuxtLink>` (card inteiro clicável)
- [ ] Dado vídeos em `processing`, `error`, `pending` ou `queued`, quando visualizo catálogo viewer, então **não** aparecem na listagem (filtro `status=ready` na API)
- [ ] Dado catálogo vazio, quando `meta.total === 0`, então vejo estado vazio com copy *"Nenhum vídeo disponível."*
- [ ] Dado vídeo sem thumbnail (v0), quando exibo card, então placeholder visual (gradiente ou ícone) substitui capa com `aspect-ratio` fixo — layout não quebra
- [ ] Dado carga inicial, quando `GET /videos` está em andamento, então vejo skeleton na área do grid (sem tela branca)
- [ ] Dado falha de rede ou `500 INTERNAL_ERROR`, quando listagem não carrega, então vejo mensagem de erro com ação **Tentar novamente**
- [ ] Dado `meta.total > limit`, quando há mais vídeos que a página atual, então vejo controles de paginação (anterior/próxima ou numeração) usando `meta.page` e `meta.total`
- [ ] Dado card no grid, quando inspeciono metadados, então vejo `title`, duração formatada (`duration`) e `created_at` formatado
- [ ] Dado viewport estreita (mobile ou notebook 13"), quando visualizo catálogo, então grid adapta colunas (1 → 2 → 3+) sem overflow horizontal

## Copy de UI

| Situação | Mensagem |
|----------|----------|
| Catálogo vazio | Nenhum vídeo disponível. |
| Erro de carregamento | Não foi possível carregar os vídeos. Tentar novamente. |
| Subtítulo do header | `{meta.total} vídeo(s)` — derivado da API |
| Loading | skeleton cards — sem copy obrigatório |

## Requisitos Não-Funcionais

- Performance: primeira render do catálogo (SSR ou CSR) em ≤ 2 s com até 50 vídeos
- Segurança: catálogo inacessível sem login (middleware `auth` — US-USR-003)
- Acessibilidade (WCAG 2.1 AA): cada card é link (`<NuxtLink>`) com título visível; placeholder de capa com `alt=""` (decorativo); foco visível na navegação por teclado; botão logout com texto ou `aria-label="Sair"`; contraste mínimo 4.5:1
- Responsividade: grid responsivo; header empilha em viewport estreita

## Fora de escopo v0

- Busca por título
- Filtros/ordenação (Recentes, Antigos, etc.)
- Barra de progresso assistido no card (`ProgressBar` — defer US-WS-001)
- Atualização em tempo real via WebSocket (recarregar página ou revisit à home)
- CTA de upload no viewer (ação exclusiva do admin — US-VID-007)

## Dependências

- US-USR-003 (login web)
- US-VID-006 (GET /videos)

## Riscos

- Nenhum significativo — US de escopo médio

## Notas de UX

### Componentes e composables

| Artefato | Responsabilidade |
|----------|------------------|
| `MediaCard` | Capa/placeholder, título, duração, data, link para `/[id]` |
| `stores/catalog` | `data`, `meta`, estados `loading` / `error` / `empty` |
| `useAuth` | Token no header das requisições |
| `middleware/auth` | Guard de rotas `/` e `/[id]` |

### Card (`MediaCard`)

- Capa: `thumbnail_url` quando presente; senão placeholder com gradiente determinístico por `id`
- Badge de duração sobre a capa (canto inferior direito)
- Metadados: título + `created_at` · duração total
- Sem indicador de progresso assistido no v0

Mockup de referência: `apps/web/mockups/dc.html` (seção **02 · Catálogo**).
