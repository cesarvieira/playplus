# UX Agent — Referência Play+

Material de apoio para revisões de design e UX. Fonte de verdade completa: `.cursorrules`, `docs/folder-structure.md`, `docs/api.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — entrada da `requirements-agent` (fase 03); saída → `architect-agent` ou `planning-agent`.

---

## Personas e superfícies

Personas canônicas: [discovery-agent/reference.md](../discovery-agent/reference.md). Resumo por superfície:

| Persona | Superfície | Jobs típicos de UX |
|---------|------------|-------------------|
| **Viewer registrado** | `apps/web` | Retomar de onde parou, navegar catálogo, player confiável, login simples |
| **Admin/Dono** | `apps/admin` | Upload de vídeos, acompanhar transcode, gerenciar catálogo e viewers |

Ao revisar, indique sempre persona + superfície — evita misturar padrões de viewer e admin na mesma análise.

---

## Inventário de componentes (planejados)

Componentes definidos em `docs/folder-structure.md`. Prefira reutilizá-los antes de criar novos.

### `apps/web`

| Componente | Responsabilidade UX |
|------------|---------------------|
| `VideoPlayer` | Reprodução HLS, controles, buffering, seek |
| `MediaCard` | Item de catálogo (capa, título, progresso parcial) |
| `ProgressBar` | Indicador visual de progresso assistido |

Composables: `usePlayer`, `useProgress`, `useAuth` — stores: `auth`, `catalog`

### `apps/admin`

| Componente | Responsabilidade UX |
|------------|---------------------|
| `UploadForm` | Metadados + upload presigned direto ao storage |
| `JobQueue` | Status de jobs BullMQ / transcode em andamento |
| `VideoTable` | Listagem, filtros por `status`, ações admin |

Composables: `useUpload`, `useJobs`, `useStats`

---

## Padrões UX por domínio

### Player e retomada (`apps/web` — WatchSession + Video)

| Momento | Padrão esperado |
|---------|-----------------|
| Abrir vídeo com progresso salvo | Oferecer retomar de `progress.position` ou começar do início — decisão explícita se ambíguo |
| Durante reprodução | Enviar `player.progress` via WebSocket a cada ~10s — sem bloquear UI |
| Vídeo `processing` | Bloquear play; mensagem clara — não player vazio ou erro genérico |
| Buffering HLS | Indicador de carregamento no player; evitar layout shift |
| Erro de segmento | Mensagem recuperável ("tentar novamente"); reportar ao Sentry em background |

### Catálogo (`apps/web` — Video)

| Momento | Padrão esperado |
|---------|-----------------|
| Listagem | Grid de `MediaCard` com paginação (`meta.page`, `meta.limit`) |
| Continuar assistindo | Destaque para itens com progresso parcial — pilar "Experiências simples" |
| Metadados | Título, duração, thumbnail — séries/episódios quando aplicável |
| Vazio | Estado vazio amigável, não tela branca |

### Upload e transcode (`apps/admin` — Video + worker)

| Etapa | Padrão esperado |
|-------|-----------------|
| 1. Metadados | Formulário → `POST /videos` → recebe `upload_url` |
| 2. Upload | Barra de progresso do upload direto ao storage — API não recebe binário |
| 3. Transcode | Botão/ação → `POST /videos/:id/transcode` → retorno imediato, job enfileirado |
| 4. Status | Progresso via WebSocket `video.status` (`queued` → `processing` → `ready`) |
| 5. Erro | `video.error` + mensagem acionável; link para retry se aplicável |
| 6. Pronto | Indicador visual `ready`; link para preview no `apps/web` se útil |

**Nunca:** spinner bloqueante aguardando FFmpeg; polling de status; upload passando pela API.

### Auth (`apps/web` + `apps/admin` — User)

| Momento | Padrão esperado |
|---------|-----------------|
| Login | Formulário email/senha; erros `UNAUTHORIZED`/`VALIDATION_ERROR` específicos |
| Sessão expirada | Refresh silencioso via cookie; redirect a login só se refresh falhar |
| Logout | Ação clara; confirmação opcional em admin se houver trabalho não salvo |
| Token | Access em memória — não expor refresh no localStorage |

### Gestão de usuários (`apps/admin` — User)

| Momento | Padrão esperado |
|---------|-----------------|
| Criar viewer | Formulário simples (email, senha, role) |
| Excluir usuário | Confirmação explícita — ação irreversível |
| Listagem | Tabela com role visível (`viewer` / admin) |

---

## Checklist a11y (streaming)

Use ao revisar telas com player ou formulários.

| Área | Verificar | Referência WCAG |
|------|-----------|-----------------|
| Controles do player | Play/pause, seek e volume acessíveis por teclado | 2.1.1 Keyboard, 2.1.2 No Keyboard Trap |
| Botões de mídia | `aria-label` descritivo ("Reproduzir", "Pausar", "Avançar 10 segundos") | 4.1.2 Name, Role, Value |
| Barra de progresso | Valor anunciável ou label associado | 1.3.1 Info and Relationships |
| Contraste | Texto e ícones sobre overlays do player (mín. 4.5:1 texto normal) | 1.4.3 Contrast (Minimum) |
| Foco visível | Controles do player e navegação do catálogo com indicador de foco | 2.4.7 Focus Visible |
| Formulários | Labels em todos os campos (login, upload, gestão de usuários) | 3.3.2 Labels or Instructions |
| Erros | Mensagens ligadas ao campo (`aria-describedby`) | 3.3.1 Error Identification |
| Movimento | Respeitar `prefers-reduced-motion` em animações de transição | 2.3.3 Animation from Interactions |
| Autoplay | Evitar autoplay com som; se autoplay de preview, permitir desligar | 1.4.2 Audio Control |

---

## Red flags UX

Red flags arquiteturais completos: [architect-agent/reference.md](../architect-agent/reference.md). Sinalize como **crítico** na UX se o design implicar:

| Red flag | Por quê |
|----------|---------|
| Polling de status de transcode ou progresso | WebSocket já definido em `docs/api.md` |
| Upload binário passando pela API | Deve ser presigned URL direto ao storage |
| UI bloqueada aguardando transcode na rota HTTP | Transcode é job BullMQ assíncrono |
| Player ativo com `status: processing` | API retorna `409 VIDEO_NOT_READY` |
| Credenciais R2/storage expostas ao cliente | Segurança — CDN serve HLS |
| Fluxo viewer e admin na mesma tela | Superfícies separadas (`apps/web` vs `apps/admin`) |
| Delete sem confirmação | Perda irreversível de vídeo, usuário ou progresso |
| Progresso de viewer visível para outro usuário | Privacidade — progresso por usuário autenticado |
| Autoplay com som ao abrir catálogo | A11y e UX mobile |

---

## Exemplo de revisão — upload admin

**Entrada:** Wireframe de tela "Novo vídeo" com botão "Enviar e aguardar processamento" que bloqueia a página.

**Saída resumida:**

```markdown
### Contexto da revisão
- Superfície: apps/admin
- Persona: Admin/Dono
- Agregado: Video
- Pilar: Histórias organizadas

### Checklist de consistência
- Alinhado: uso de UploadForm + metadados antes do upload
- Desalinhado: bloqueio síncrono — contradiz pipeline assíncrono BullMQ

### Problemas de usabilidade
- **Crítico:** botão "aguardar processamento" bloqueia UI por minutos em arquivos grandes
- **Aviso:** sem indicador de progresso do upload presigned

### Problemas de acessibilidade
- **Aviso:** barra de progresso sem `aria-valuenow` / `aria-valuetext`

### Sugestões de melhoria
1. Após upload, enfileirar transcode e redirecionar para VideoTable com status `processing`
2. Inscrever em WebSocket `video.status` para atualizar progresso em tempo real
3. Usar JobQueue ou badge na linha do vídeo

### Impacto técnico
- Composables: useUpload, useJobs
- WebSocket: video.status, video.error
- Erros: JOB_ALREADY_QUEUED, VIDEO_NOT_READY

### Aprovado para desenvolvimento?
Com ressalvas — corrigir fluxo síncrono antes de implementar
```

---

## Exemplo de revisão — retomada viewer

**Entrada:** Tela de detalhe do vídeo sempre inicia do segundo 0, sem indicar progresso salvo.

**Saída resumida:**

```markdown
### Contexto da revisão
- Superfície: apps/web
- Persona: Viewer registrado
- Agregado: WatchSession + Video
- Pilar: Experiências simples

### Problemas de usabilidade
- **Crítico:** ignora `progress.position` retornado por GET /videos/:id
- **Sugestão:** MediaCard no catálogo poderia mostrar ProgressBar parcial

### Sugestões de melhoria
1. Ao abrir VideoPlayer, seek para progress.position (±5s) com opção "Começar do início"
2. Banner "Continuar de 57:00" antes do play

### Impacto técnico
- Composables: usePlayer, useProgress
- WebSocket: player.progress (~10s)
- Componentes: VideoPlayer, ProgressBar, MediaCard

### Aprovado para desenvolvimento?
Não — retomada é requisito central do pilar Experiências simples
```

---

## Handoff

### Entrada (da Requirements Agent)

Invoque `ux-agent` quando houver User Stories com superfície `apps/web` ou `apps/admin` — antes de implementar UI.

**O que enviar:**

- User Stories com critérios de aceite (IDs `US-*`)
- Wireframes, descrições de fluxo ou mockups (se existirem)
- Business Case ou pilar/agregado vinculados

**Próximo agente:** `architect-agent` (se decisão arquitetural relevante) ou `planning-agent` — ver [../FLUXO.md](../FLUXO.md).

US puramente backend/worker (`apps/api`, `packages/worker`) sem UI podem ir direto ao `planning-agent`, sem passar pelo UX Agent.

### Saída (checklist para planning/dev)

Quando **aprovado para desenvolvimento**, inclua checklist:

- [ ] Componentes/composables mapeados (`VideoPlayer`, `useUpload`, etc.)
- [ ] Eventos WebSocket documentados na UX (`video.status`, `player.progress`)
- [ ] Erros tipados com copy de UI (`VIDEO_NOT_READY`, etc.)
- [ ] Estados vazios, loading e erro definidos
- [ ] Viewport estreita validada (mobile + 13")
- [ ] Confirmações para ações destrutivas admin
- [ ] Ordem: `packages/shared` → `apps/api` → `packages/worker` (se mídia) → frontend
