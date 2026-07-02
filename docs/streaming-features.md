# Roadmap: De Pipeline de Upload → Streaming Profissional

**Contexto:** Home media center familiar — um usuário administrador (conta única), múltiplos perfis de família (adultos e crianças), conteúdo misto (filmes, séries, desenhos).

Análise do estado atual e o que falta para transformar o Play+ em uma experiência de streaming completa.

---

## 1. Metadados de Conteúdo

**Status:** ❌ Inexistente — a tabela `videos` é um schema de pipeline (title, fileName, fileSize, status), sem nenhum campo de catálogo.

### O que fazer

**DB (`apps/api/src/infra/database/schema/videos.ts`)**

- Adicionar colunas: `description text`, `year smallint`, `rating varchar(5)` (livre/10/12/14/16/18), `director varchar(255)`
- Criar tabela `tags` + pivot `video_tags(video_id, tag_id)`
- Criar tabela `categories` + pivot `video_categories(video_id, category_id)`

**Domínio / Shared (`packages/shared`)**

- Adicionar campos ao tipo `Video` e ao `CreateVideoDto` / `UpdateVideoDto` (novo)
- Atualizar `VideoEntity` com os novos campos

**API (`apps/api/src/modules/video`)**

- Novo use-case `update-video-metadata.use-case.ts`
- Novo schema Zod para o body do PATCH
- Rotas de categorias: `GET /categories`, `POST /categories`

**Admin (`apps/admin`)**

- Formulário de edição de metadados (sinopse, ano, classificação, diretor, tags, categorias) na página de vídeo
- Seletor de categorias no `UploadModal`

**Web (`apps/web`)**

- Exibir sinopse, ano, classificação e categorias na página `[id].vue`
- Filtro por categoria no catálogo (`/`)

---

## 2. Thumbnail / Poster

**Status:** ⚠️ Parcialmente pronto — o `MediaCard` já renderiza `thumbnail_url` e tem fallback de gradiente. Mas a coluna não existe no DB e o worker não gera o frame.

### O que fazer

**DB**

- Adicionar coluna `thumbnail_key varchar(512)` à tabela `videos`

**Worker (`packages/worker`)**

- Após o transcode HLS, extrair frame com FFmpeg (ex: no instante `duration * 0.1`)
- Upload do `.jpg` para o storage com key `hls/{id}/thumbnail.jpg`
- Atualizar `thumbnail_key` no banco via API ou diretamente

**API**

- Incluir `thumbnail_url` (URL assinada ou pública) no response de `GET /videos/:id` e na listagem
- Ou gerar a URL no lado do client a partir do `storageHlsPrefix` (mais simples)

**Admin**

- Exibir thumbnail gerado na `VideoTable` / `VideoRow`
- Permitir upload de thumbnail customizado (substitui o gerado)

---

## 3. Página de Detalhe ("Ficha do Filme")

**Status:** ❌ O `[id].vue` vai direto ao player — título e data abaixo, sem mais contexto.

### O que fazer

**Web (`apps/web/app/pages/[id].vue`)**

- Redesenhar como página de detalhe: banner/poster grande, título, sinopse, metadados (ano, duração, classificação, diretor, categorias)
- Botão "Assistir" que abre o player (inline na mesma página ou em modal)
- Indicador de "Já assistido" ou barra de progresso parcial (ver seção 5)
- Estado de processamento/erro mantido (já existe `PlayerUnavailable`)

---

## 4. Troca de Qualidade no Player

**Status:** ⚠️ Quase pronto — `usePlayer` já rastreia `levels: Level[]` e `currentLevelIndex` internamente via hls.js. Falta apenas expor e criar a UI.

### O que fazer

**`apps/web/app/composables/usePlayer.ts`**

- Adicionar função `setQuality(levelIndex: number)` que chama `hlsInstance.currentLevel = levelIndex` (-1 = auto)
- Expor `levels` e `currentLevelIndex` no retorno do composable
- Garantir que `levels` seja mapeado para `{ label: '1080p', index: 0 }[]` para facilitar o consumo

**`apps/web/app/components/PlayerControls.vue`**

- Adicionar botão de qualidade (ícone de engrenagem ou `HD`)
- Dropdown/menu com as opções disponíveis: Auto, 1080p, 720p, 480p, 240p
- Destacar a qualidade ativa
- Acessibilidade: navegável por teclado, fechar com `Escape`

**`apps/web/app/components/VideoPlayer.vue`**

- Passar `levels`, `currentLevelIndex` e `setQuality` como props/emit para `PlayerControls`

> **Nota:** Para Safari (native HLS), `levels` não estará disponível via hls.js — esconder o seletor ou exibir apenas a resolução detectada em `currentResolution`.

---

## 5. Progresso de Assistência e Marcação de Assistido

**Status:** ❌ Inexistente.

### O que fazer

> ⚠️ **Dependência:** esta seção deve ser implementada **após** os Perfis de Família (seção 9), pois `watch_progress` deve ser por perfil, não por usuário.

**DB**

```sql
CREATE TABLE watch_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,  -- segundos
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  watched_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, video_id)
);
```

**API**

- `PUT /videos/:id/progress` — salva ou atualiza `{ position, completed }` para o perfil ativo na sessão
- `GET /videos/:id/progress` — retorna progresso do perfil ativo
- `GET /me/watch-history` — lista vídeos com progresso (para "Continuar Assistindo")

**Web — Player (`usePlayer.ts` / `VideoPlayer.vue`)**

- Salvar posição a cada 10s via `PUT /videos/:id/progress` com debounce
- Ao iniciar, buscar progresso existente e fazer seek para `position` (com confirmação ou automaticamente)
- Marcar como `completed = true` quando `currentTime >= duration * 0.9`

**Web — Catálogo / Detalhe**

- `MediaCard`: barra de progresso na thumbnail quando há progresso parcial
- `MediaCard`: badge "Assistido" (✓) quando `completed = true`
- Seção "Continuar Assistindo" no topo do catálogo (filtrando vídeos com `0 < position < duration * 0.9`)

**Admin**

- Estatísticas básicas por vídeo: total de plays, % de conclusão média (futuro)

---

## 6. Busca

**Status:** ❌ Inexistente.

### O que fazer

**API**

- Adicionar parâmetro `q` na query de listagem (`GET /videos?q=...`)
- Full-text search no Postgres: `to_tsvector('portuguese', title || ' ' || description) @@ plainto_tsquery('portuguese', $q)`
- Criar índice GIN na coluna computada

**Web**

- Campo de busca no `AppHeader` ou no topo do catálogo
- Debounce de 300ms antes de disparar a query
- Estado vazio específico para "nenhum resultado para X"

---

## 7. Legendas

**Status:** ❌ Inexistente — nem no schema, nem no worker, nem no player.

### O que fazer

**DB**

- Criar tabela `subtitles`:

```sql
CREATE TABLE subtitles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language    VARCHAR(10) NOT NULL,   -- BCP-47: pt-BR, en, es...
  label       VARCHAR(50) NOT NULL,   -- "Português", "English"
  storage_key VARCHAR(512) NOT NULL,  -- caminho do .vtt no storage
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Admin**

- Seção "Legendas" na página de edição do vídeo
- Upload de arquivo `.srt` ou `.vtt` por idioma
- Seletor de idioma + label + toggle "padrão"
- Listagem das legendas já vinculadas com opção de remover

**API**

- `POST /videos/:id/subtitles` — recebe arquivo + `{ language, label, isDefault }`, converte SRT → WebVTT se necessário, sobe para o storage, persiste no DB
- `GET /videos/:id/subtitles` — retorna lista de legendas com URLs assinadas
- `DELETE /videos/:id/subtitles/:subtitleId`
- Incluir `subtitles[]` no response de `GET /videos/:id`

**Worker (opcional, conversão automática)**

- Se o vídeo original vier acompanhado de `.srt` embutido (stream de legenda), extrair com FFmpeg durante o transcode e converter para WebVTT
- Mais realista para conteúdo com legenda já incorporada no container (MKV, MP4)

**Web — Player (`usePlayer.ts`)**

- hls.js expõe `hls.subtitleTracks` e `hls.subtitleTrack` (índice ativo, -1 = desativado)
- Adicionar `subtitleTracks`, `currentSubtitleIndex` ao estado
- Adicionar função `setSubtitle(index: number)` — `-1` desativa
- Escutar `Hls.Events.SUBTITLE_TRACKS_UPDATED` para popular a lista
- Para Safari (native HLS): usar elementos `<track kind="subtitles">` injetados dinamicamente no `<video>`

**Web — `VideoPlayer.vue`**

- Injetar `<track>` elements no `<video>` para Safari quando `subtitles` vier no prop `video`
- Passar lista de legendas e estado atual para `PlayerControls`

**Web — `PlayerControls.vue`**

- Botão de legenda (ícone `CC` ou balão de fala)
- Dropdown com opções: "Desativada" + idiomas disponíveis
- Destacar a legenda ativa
- Mesmo padrão de acessibilidade do seletor de qualidade (navegável, fecha com `Escape`)

> **Nota:** WebVTT é o formato nativo da web e do hls.js. Se o admin só aceitar `.srt`, a conversão deve acontecer na API antes de subir para o storage — não deixar o client fazer isso.

---

## 8. Conteúdo em Destaque (Hero / Banner)

**Status:** ❌ Inexistente.

### O que fazer

**DB**

- Adicionar coluna `featured BOOLEAN DEFAULT FALSE` na tabela `videos` (simples)
- Ou criar tabela `featured_slots(position, video_id, valid_until)` para controle mais rico

**Admin**

- Toggle "Em destaque" na edição do vídeo

**Web**

- Componente `HeroBanner` no topo do catálogo exibindo o vídeo destacado com poster grande, título, sinopse curta e botão "Assistir"
- Fallback para o vídeo mais recente caso nenhum esteja marcado como destaque

---

## 9. Perfis de Família

**Status:** ❌ Inexistente — a conta tem um único contexto de usuário sem separação de perfis.

### Conceito

Um usuário (conta) cria múltiplos perfis: "Guto", "Esposa", "Filho". Cada perfil tem nome, avatar e uma classificação de acesso (`adult` ou `child`). O catálogo visível e todo o estado de usuário (progresso, watchlist) são por perfil. O perfil `child` enxerga apenas conteúdo com rating ≤ ao definido para o perfil.

### O que fazer

**DB**

```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL,
  avatar_url      VARCHAR(512),
  kind            VARCHAR(10) NOT NULL DEFAULT 'adult',  -- 'adult' | 'child'
  max_rating      VARCHAR(5),   -- null = sem restrição; '12', '14', '16', '18' para child
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

- `watch_progress` e `watchlist` (seções 5 e 10) usam `profile_id` ao invés de `user_id`
- O token de sessão ou um header `X-Profile-Id` identifica o perfil ativo

**API**

- `GET /me/profiles` — lista perfis da conta
- `POST /me/profiles` — cria perfil `{ name, kind, maxRating, avatarUrl }`
- `PATCH /me/profiles/:id` — edita
- `DELETE /me/profiles/:id`
- Middleware de perfil: valida `X-Profile-Id` e injeta `currentProfile` no contexto da request
- Filtro automático de catálogo: se `profile.kind === 'child'`, aplica `WHERE rating <= profile.maxRating`

**Web**

- Tela de seleção de perfil após login (igual Netflix): grid com avatares + "Gerenciar Perfis"
- Perfil ativo persistido na sessão (cookie ou store)
- Header exibe avatar do perfil ativo com dropdown para troca
- Catálogo filtra automaticamente pelo perfil — o usuário não vê o filtro, ele é transparente

**Admin**

- Nenhuma mudança necessária — admin é sempre a conta raiz, sem escopo de perfil

> **Nota de arquitetura:** o perfil ativo precisa trafegar nas requests autenticadas. A abordagem mais limpa é incluir `profileId` no access token (claim extra) ou via header `X-Profile-Id` validado pelo middleware. A segunda opção é mais flexível para troca de perfil sem re-login.

---

## 10. Watchlist / Minha Lista

**Status:** ❌ Inexistente.

> ⚠️ **Dependência:** implementar após Perfis (seção 9).

### O que fazer

**DB**

```sql
CREATE TABLE watchlist (
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  added_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, video_id)
);
```

**API**

- `POST /watchlist/:videoId` — adiciona ao perfil ativo
- `DELETE /watchlist/:videoId` — remove
- `GET /watchlist` — lista do perfil ativo (paginada)
- Incluir flag `in_watchlist: boolean` no response de detalhe do vídeo

**Web**

- Botão ♡ / + no `MediaCard` e na página de detalhe — toggle imediato com optimistic update
- Seção "Minha Lista" no catálogo ou página dedicada `/watchlist`
- Estado do botão reflete o perfil ativo (troca de perfil = botões re-renderizam)

---

## 11. Séries, Temporadas e Episódios

**Status:** ❌ Inexistente — o modelo atual é um catálogo plano de vídeos sem hierarquia.

### Conceito

```
Series
 └─ Season 1
 │   ├─ Episode 1 → video
 │   ├─ Episode 2 → video
 │   └─ Episode 3 → video
 └─ Season 2
     └─ Episode 1 → video
```

Um `video` pode ser standalone (filme) ou estar vinculado a um episódio. O catálogo exibe séries como um item único; a página de detalhe lista as temporadas/episódios.

### O que fazer

**DB**

```sql
CREATE TABLE series (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  thumbnail_key VARCHAR(512),
  rating       VARCHAR(5),
  year         SMALLINT,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id   UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  number      SMALLINT NOT NULL,
  title       VARCHAR(255),   -- "Temporada 1" ou nome especial
  UNIQUE (series_id, number)
);

-- Tabela de episódios (liga season → video existente)
CREATE TABLE episodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id   UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  number      SMALLINT NOT NULL,
  title       VARCHAR(255),
  UNIQUE (season_id, number)
);
```

- Adicionar coluna `series_id` opcional na tabela `videos` não é necessário — a relação inversa existe via `episodes`
- O catálogo diferencia `type: 'movie' | 'series'` na query de listagem

**API**

- CRUD de `series`, `seasons`, `episodes` (rotas no admin)
- `GET /series/:id` — retorna série com seasons → episodes → video (status, duration, thumbnail)
- `GET /catalog` — retorna mix de filmes e séries, com `type` e `episodeCount`
- Próximo episódio: `GET /series/:id/next-episode?profileId=` — baseado no progresso

**Admin**

- Seção "Séries" separada de "Vídeos"
- Criar série → adicionar temporadas → vincular vídeos como episódios
- Vídeo pode ser "sem série" (filme) ou episódio de uma série

**Web**

- `MediaCard` com indicador de série (ex: badge "S" ou "5 ep")
- Página de série: poster grande, descrição, accordion de temporadas com lista de episódios
- Episódio com barra de progresso individual
- Botão "Continuar" leva ao próximo episódio não assistido
- Player com "Próximo episódio em 10s" ao final

---

## 12. Status de Publicação

**Status:** ❌ Inexistente — vídeo fica visível imediatamente após transcode.

### O que fazer

**DB**

- Adicionar coluna `published_at TIMESTAMP WITH TIME ZONE` na tabela `videos` (e em `series`)
- `NULL` = rascunho (invisível no catálogo); data no passado = publicado; data no futuro = agendado

**API**

- Filtro automático no catálogo: `WHERE published_at IS NOT NULL AND published_at <= NOW()`
- Endpoint `PATCH /videos/:id/publish` — define `published_at = NOW()`
- Endpoint `PATCH /videos/:id/schedule` — define `published_at = <data futura>`
- Endpoint `PATCH /videos/:id/unpublish` — define `published_at = NULL`

**Admin**

- Status de publicação visível na `VideoTable`: Rascunho / Publicado / Agendado (com data)
- Ação "Publicar agora", "Agendar" e "Despublicar" no menu do vídeo
- Badge colorido na listagem por status

**Web**

- Nenhuma mudança necessária — o filtro é transparente no catálogo

---

## 13. Visibilidade por Perfil (Catálogo Privado)

**Status:** ❌ Inexistente.

### Conceito

Dois eixos independentes controlam o que um perfil vê no catálogo:

- **Eixo 1 — Rating:** automático, baseado no `rating` do conteúdo vs `max_rating` do perfil (seção 9)
- **Eixo 2 — Visibilidade:** explícito, o admin escolhe quais perfis podem ver um item específico

O eixo 2 é esta seção. Um vídeo com `visibility = 'private'` só aparece para os perfis explicitamente autorizados — mesmo que sejam adultos, mesmo que o rating seja livre. É o equivalente a "pasta pessoal" por perfil.

### Casos de uso no home media center

- Guto tem vídeos de trabalho que não precisa aparecer para esposa e filhos
- Conteúdo adulto que o perfil adulto da esposa não precisa ver
- Surpresas (vídeos de aniversário escondidos até a data)

### Modelo de dados

```sql
-- Adicionar à tabela videos (e series):
ALTER TABLE videos ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'public';
-- 'public'   = todos os perfis elegíveis (respeitando rating) enxergam
-- 'private'  = somente perfis na allowlist abaixo

CREATE TABLE video_profile_access (
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, profile_id)
);
```

### Query do catálogo com os dois eixos

```sql
-- Perfil ativo: $profileId, $maxRating (null = sem restrição)
SELECT v.*
FROM videos v
WHERE v.published_at IS NOT NULL AND v.published_at <= NOW()
  -- Eixo 1: filtro de idade
  AND ($maxRating IS NULL OR v.rating IS NULL OR v.rating <= $maxRating)
  -- Eixo 2: filtro de visibilidade
  AND (
    v.visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM video_profile_access vpa
      WHERE vpa.video_id = v.id AND vpa.profile_id = $profileId
    )
  )
```

### O que fazer

**API**

- Campo `visibility` incluído no `UpdateVideoDto`
- Endpoints para gerenciar a allowlist:
  - `PUT /videos/:id/access` — define `{ profileIds: UUID[] }` (substitui a lista inteira)
  - `GET /videos/:id/access` — retorna perfis com acesso
- A query do catálogo aplica ambos os filtros automaticamente com base no perfil ativo

**Admin**

- Toggle "Privado / Público" na edição do vídeo
- Quando "Privado": multi-select dos perfis que terão acesso (lista os perfis existentes na conta)
- Badge "🔒 Privado" na `VideoTable`

**Web**

- Nenhuma mudança necessária — o filtro é transparente no catálogo
- Opcional: exibir um ícone de cadeado discreto no `MediaCard` para o admin identificar conteúdo privado

> **Nota sobre séries:** visibilidade definida na `series` deveria herdar para todos os episódios. Implementar cascata na query ou desnormalizar `visibility` na tabela `episodes` para simplicidade.

---

## 14. Velocidade de Reprodução

**Status:** ❌ Inexistente no player, mas trivial de implementar.

### O que fazer

**`apps/web/app/composables/usePlayer.ts`**

- Adicionar `playbackRate = ref(1)` ao estado
- Função `setPlaybackRate(rate: number)` que chama `videoRef.value.playbackRate = rate`
- Opções: `[0.5, 0.75, 1, 1.25, 1.5, 2]`
- Persistir preferência em `localStorage` (lembrar entre sessões)

**`apps/web/app/components/PlayerControls.vue`**

- Botão com label da velocidade atual (ex: `1×`)
- Dropdown com as opções, destacando a ativa

---

## Prioridade Sugerida

Com o contexto de home media center familiar, a ordem leva em conta duas coisas: **desbloqueio de dependências** (perfis precisam vir antes de watchlist e progresso) e **impacto percebido pela família** (thumbnail e perfis são o que mais vai fazer diferença no dia a dia).

| #   | Feature                                    | Esforço     | Por que agora                                                    |
| --- | ------------------------------------------ | ----------- | ---------------------------------------------------------------- |
| 1   | Thumbnail/poster                           | Médio       | Impacto visual imediato no catálogo                              |
| 2   | Metadados (descrição, rating, ano)         | Alto        | Desbloqueia perfis + filtro por idade                            |
| 3   | Status de publicação                       | Baixo       | Controle editorial antes de abrir pra família                    |
| 4   | **Perfis de família**                      | Alto        | Desbloqueia watchlist, progresso e catálogo por perfil           |
| 5   | Visibilidade por perfil (catálogo privado) | Médio       | Depende de perfis; essencial antes de compartilhar com a família |
| 6   | Progresso + "assistido"                    | Médio       | Depende de perfis                                                |
| 7   | Watchlist / Minha Lista                    | Baixo-Médio | Depende de perfis                                                |
| 8   | Página de detalhe redesenhada              | Médio       | Melhor UX para filmes e séries                                   |
| 9   | Velocidade de reprodução                   | Baixo       | Esforço mínimo, uso frequente                                    |
| 10  | Troca de qualidade no player               | Baixo       | Quase pronto                                                     |
| 11  | Legendas                                   | Médio       | Importante para filmes em idioma original                        |
| 12  | **Séries / Temporadas / Episódios**        | Alto        | Grande mudança de schema, mas essencial para séries              |
| 13  | Categorias navegáveis                      | Médio       | Melhor descoberta quando o catálogo crescer                      |
| 14  | Busca                                      | Baixo-Médio | Útil a partir de ~20 títulos                                     |
| 15  | Hero/banner em destaque                    | Baixo       | Polimento final da home                                          |

> **Ordem racional para home media center:** Thumbnail + metadados primeiro porque habilitam a classificação por idade. Perfis logo depois — sem eles, progresso e watchlist não fazem sentido no contexto familiar. Visibilidade por perfil entra junto com perfis porque você vai querer marcar conteúdo privado antes de dar acesso à família. Séries ficam por último por serem a maior mudança estrutural.
