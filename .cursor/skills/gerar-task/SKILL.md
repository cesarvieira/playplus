---
name: gerar-task
description: >-
  Gera ou refina issues estruturadas no GitHub para o Play+. Modo **gerar**: transforma
  US/SPEC/planejamento em épico e sub-issues. Modo **refinar**: melhora, enriquece ou
  revisa issue existente (texto, link GitHub ou .md). Triggers gerar: "gerar tasks",
  "criar issues", "montar backlog", "quebrar a SPEC", "criar épico". Triggers refinar:
  "melhora essa task", "enriquecer issue", "refinar task", "melhorar descrição",
  "analisar task", "preparar issue", "revisar task", ou conteúdo que pareça issue de dev.
  Obrigatório: preservar anexos/links na descrição; antes de editar issue existente,
  comentário com snapshot de title+body+labels; confirmação explícita antes de alterar
  GitHub. Metadados narrativos sugeridos só no fim do chat — não como tabela na descrição.
  Publicação (C): aplicar labels, título e corpo refinado conforme §6.8 e reference.md.
  Essencial para consistência nas tasks — não improvisar sem esta skill.
disable-model-invocation: true
---

# Gerar e Refinar Tasks — Play+ → GitHub Issues

> **Fase:** 06b — opcional entre `planning-agent` e `dev-agent`
> **Quem usa:** Dono do projeto / desenvolvedor solo
> **Ferramenta obrigatória:** CLI `gh` (GitHub CLI). Não usar Jira nem MCP Atlassian.

Dois modos complementares:

| Modo | Entrada | Saída |
|------|---------|-------|
| **Gerar** | US/SPEC, `docs/planning/`, breakdown do `planning-agent` | Épico + sub-issues no GitHub |
| **Refinar** | Texto, link `github.com/.../issues/N`, `.md` colado | Pré-visualização enriquecida → issue editada ou `.md` local |

**Fontes canônicas Play+ (preferir nesta ordem):**

1. `docs/requirements/`, `docs/planning/`, `docs/adr/`, `docs/api.md`
2. Saída do `planning-agent`
3. Markdown ou issue existente colada no chat

**Contexto obrigatório:** [`.cursorrules`](../../../.cursorrules), [`../FLUXO.md`](../FLUXO.md), [`reference.md`](reference.md).

**Handoff posterior:** issues criadas/refinadas → `dev-agent`, ordem `shared → api → worker → frontend`.

---

## 1. Detectar contexto de execução
- Ler arquivos e buscar no repositório **antes** de enriquecer ou quebrar
- Mapear `apps/web/pages/**`, `apps/admin/pages/**`, `apps/api/src/modules/**` ao catálogo de superfícies ([reference.md § Superfícies](reference.md#superfícies-e-agregados-play))
- Priorizar paths reais — não alucinar módulos

---

## 2. Receber e normalizar o input

| Formato | Ação |
|---------|------|
| Arquivo no repo (`docs/planning/iter-*.md`, US em `docs/requirements/`) | Ler e extrair tasks/US |
| Markdown colado | Tratar como SPEC/US ou rascunho de issue |
| Link GitHub Issues | `gh issue view <N> --json title,body,labels,number` |
| Texto livre | Descrição bruta — modo **Refinar** |

Preserve IDs de rastreabilidade (`US-VID-007`, `T01`, `iter-01`) em títulos, labels ou corpo.

---

## 3. Analisar o repositório

```
1. Identificar módulos/arquivos mencionados ou inferidos
2. Ler código relevante (Vue, Fastify, worker, shared)
3. Mapear rotas/páginas → superfície (web | admin) — reference.md
4. Verificar padrões DDD, convenções do monorepo
5. Identificar dependências (shared, fila api↔worker, contratos)
6. Estimar complexidade com base no código
```

### Comparar SPEC vs repositório (modo Gerar)

| Status | Critério |
|--------|----------|
| ✅ Implementado | Existe e alinhado à US/SPEC |
| ⚠️ Parcial | Existe, precisa ajuste |
| ❌ Ausente | Não implementado |

Criar issues **apenas** para ausente, parcial ou desalinhado.

### Domínio Play+ (ambos os modos)

- **Agregados:** `Video`, `User`, `WatchSession`
- **Superfícies:** `packages/shared`, `apps/api`, `packages/worker`, `apps/web`, `apps/admin`, `infra`
- **Camadas API:** `domain` → `application` → `infra` → `http`
- **Fluxos críticos:** presigned upload → BullMQ → FFmpeg HLS → `status: ready`; auth JWT+refresh; WebSocket sem polling

---

## 4. Verificar completude do input (ambos os modos)

Antes de enriquecer, se algum item estiver ausente ou ambíguo demais para inferir com alta confiança, **sinalizar e aguardar**:

| Campo | Quando perguntar |
|-------|------------------|
| Contexto de negócio | Não fica claro qual problema ou fluxo afeta |
| Comportamento esperado | Impossível definir o que é "feito" |
| Superfície afetada | Sem pista de módulo, app ou agregado |
| Critérios de aceite | Task vaga demais |
| Dependências | Menção a outros sistemas/tasks sem detalhe |

```
⚠️ Preciso de mais informações antes de continuar

Para compor esta task com qualidade, preciso que você esclareça:
1. [pergunta objetiva]
2. [pergunta objetiva]

Pode responder aqui que sigo com o refinamento.
```

---

## 5. Preservação de conteúdo original (obrigatório)

Ao refinar issue existente no GitHub (ou conteúdo colado com mídia/links):

- **Nunca remover** o conteúdo original
- Manter bloco original (texto + imagens + links) **no topo** da descrição
- Acrescentar refinamento **abaixo**, separado por `---`

Violação perde evidência de bug e quebra rastreabilidade.

---

## 6. Enriquecer ou Gerar a task (ambos os modos)

### 6.1 Título
- Imperativo, claro: "Adicionar GET /v1/videos com paginação no módulo video"
- Máximo ~80 caracteres
- Incluir superfície ou path quando ajudar: `packages/shared`, `apps/api`, etc.

### 6.2 Descrição

Estrutura sugerida (adaptar conforme necessidade):

```markdown
## Contexto
[Por que existe? Qual agregado/fluxo Play+?]

## Problema / Situação atual (opcional)
[O que acontece hoje no repo ou no produto?]

## Solução proposta
[O que fazer — camadas DDD, arquivos-alvo, contratos]

## Impacto esperado
[O que muda para usuário/sistema]

## Riscos e dependências
[Fila, shared, migration, breaking changes]
```

Paths de arquivo e detalhes técnicos vão **na descrição**; superfície e story points vão em **labels**; agregado/prioridade no frontmatter (§6.8).

### 6.3 Critérios de aceite
- Checklist objetivo — mínimo 3, máximo 8
- Estilo Given/When/Then quando couber
- Referenciar `docs/api.md`, códigos de erro tipados, eventos WebSocket quando aplicável
- [ ] [Critério testável 1]
- [ ] [Critério testável 2]
- [ ] [Happy path, falha e edge cases cobertos ou N/A documentado]

### 6.4 Avaliação e tipo sugerido

**Obrigatório:** 1–3 frases (natureza, impacto, urgência) + tipo sugerido:

| Tipo GitHub | Quando usar |
|-------------|-------------|
| **bug** (`bug`) | Comportamento incorreto, regressão, segurança, dados inconsistentes |
| **enhancement** | Nova funcionalidade ou capacidade para o usuário |
| **documentation** | Só docs, sem código de produção |
| **spike** (`spike`) | Investigação timeboxed — não entrega feature |

Se `--type Feature/Bug` estiver habilitado no repo, alinhar; se falhar, usar só labels.

### 6.5 Superfície e agregado (catálogo Play+)

Usar **exclusivamente** valores do catálogo em [reference.md § Superfícies](reference.md#superfícies-e-agregados-play).

**Proibido** inventar labels genéricas (`Auth Service`, `Checkout UI`, paths como label).

| Regra | Detalhe |
|-------|---------|
| **Label de superfície** | Uma issue → **uma** label principal: `shared`, `api`, `worker`, `web`, `admin`, `infra` |
| **Agregado** | Opcional no corpo/frontmatter: `Video`, `User`, `WatchSession` |
| **Múltiplas superfícies** | **Desmembrar** em issues separadas (§8) — não uma issue com `api,web` |
| **Transversal** | CI, Docker, deps, docs técnicos → `infra` ou `documentation` |

Mapeamento rápido:

- `packages/shared/**` → `shared`
- `apps/api/src/modules/video/**` → `api` + agregado Video
- `packages/worker/**` → `worker`
- `apps/web/pages/**` → `web`
- `apps/admin/pages/**` → `admin`
- `.github/workflows`, `docker-compose*.yml` → `infra`

### 6.6 Story points (labels `pts-*`)

Fibonacci: `0.5 | 1 | 2 | 3 | 5 | 8` — **>8 obrigatório desmembrar**

| Points | Label | Critério |
|--------|-------|----------|
| 0.5 | `pts-0.5` | Trivial — config, texto |
| 1 | `pts-1` | Simples, caminho único |
| 2 | `pts-2` | 1–2 arquivos, baixa incerteza |
| 3 | `pts-3` | Moderada, alguns edge cases |
| 5 | `pts-5` | Múltiplos arquivos/camadas ou incerteza média |
| 8 | `pts-8` | Muito complexa — avaliar quebra |

**Regras:**
- Uma issue → **exatamente uma** label `pts-*` (nunca duas)
- Criar labels faltantes com `gh label create` — ver [reference.md § Labels de pontos](reference.md#labels-de-story-points-pts)
- Ao editar issue: `--remove-label` da `pts-*` antiga antes de `--add-label` da nova
- **Não** registrar SP no corpo nem no frontmatter — só na label

### 6.7 Prioridade

`alta | média | baixa` no frontmatter YAML.

| Valor | Critério Play+ |
|-------|----------------|
| alta | Bloqueia pipeline HLS, auth, reprodução, segurança |
| média | Feature planejada, melhoria relevante (default) |
| baixa | Nice-to-have, refactor cosmético |

### 6.8 Metadados: chat vs corpo da issue

**No chat (§9):** bloco **Metadados sugeridos** ao final — avaliação narrativa, tipo, tabela de campos.

**No corpo da issue (publicação C):**
- Frontmatter YAML compacto no topo — **sem** story points ([reference.md](reference.md#metadados-no-corpo-da-issue))
- **Não** colar a tabela narrativa "Metadados sugeridos" do chat no corpo
- Aplicar **labels** de superfície, tipo e `pts-*` via `gh issue edit`

```markdown
---
**Prioridade:** média
**Agregado:** Video
**US origem:** US-VID-007
---
```

Labels na issue: `api`, `enhancement`, `pts-3`

---

## 7. Desmembramento

Avaliar quebra quando:
- Story points > 8
- Mais de uma superfície (`api` + `web`)
- Etapas independentes (shared antes de api)
- Critérios de aceite de domínios distintos

### 7.1 Regra obrigatória — backend e frontend nunca na mesma issue

**Proibido** escopo `api`/`worker`/`shared` **e** `web`/`admin` na mesma issue.

Se a task envolver ambos:

1. Issue atual = backend (`api`/`shared`/`worker`)
2. Nova issue = frontend (`web` ou `admin`), referenciando a backend como dependência
3. Informar qual está sendo refinada agora; oferecer refinar a segunda em seguida
4. Vincular: `Depende de: #N` no corpo + `--blocked-by N`

---

## 8. Formato de output (ambos os modos)

Ordem obrigatória:

1. Título, descrição, critérios, desmembramento — **aptos para o GitHub**
2. **Por último:** Metadados sugeridos — **somente chat** (e `.md` completo opcional)

```markdown
# 🎯 Task Refinada

## Título
[Título melhorado]

## Descrição
[Com original preservado no topo se issue existente]

## Critérios de Aceite
- [ ] ...

## ⚠️ Desmembramento Recomendado
[Se aplicável]

---

## Metadados sugeridos *(não copiar tabela para o corpo da issue)*

> Aplicar via frontmatter YAML + labels (`superfície`, `pts-*`, tipo) na publicação (C). Ver §6.8.

### Avaliação
[1–3 frases]

### Tipo sugerido
**[ bug | enhancement | documentation | spike ]** — [justificativa]

| Campo | Valor |
|-------|-------|
| Labels (superfície) | `api` |
| Label (story points) | `pts-3` |
| Agregado | Video |
| Prioridade | média |

---
*Análise baseada em: [código local / inferência de domínio]*
```

---

## 9. Apresentar, confirmar e persistir

Ordem **obrigatória** — nunca inverter:

1. Buscar e analisar (issue, código, contexto)
2. Gerar pré-visualização completa (§9) — descrição com anexos preservados (§5)
3. **Parar e pedir confirmação:**

   > Refino/backlog pronto acima. Deseja **(A)** só referência no chat, **(B)** salvar `.md` local, ou **(C)** publicar no GitHub?
   > Confirme se a descrição **mantém** imagens, links e anexos.

4. **Somente após** resposta afirmativa:
   - **(B)** gravar em `tasks/<#N>/` ou caminho indicado (ex.: `*-refinamento.md`)
   - **(C)** modo Refinar: §5.1 snapshot → `gh issue edit`; modo Gerar: §7

### Publicação GitHub (C) — issue existente

1. `gh issue comment` com snapshot (§5.1)
2. `gh issue edit <N> --title "..." --body-file refined.md --add-label "api,enhancement,pts-3" --remove-label "web,pts-2"`
3. Garantir **uma** label `pts-*` e **uma** label de superfície
4. Opcional: segundo comentário resumindo alterações

### Publicação GitHub (C) — modo Gerar

Seguir §7 após aprovação do breakdown (épico → sub-issues → `--blocked-by`).

---

## 10. Casos especiais

| Situação | Ação |
|----------|------|
| SPEC grande (15+ issues) | Breakdown completo; perguntar se cria tudo ou por superfície |
| Épico existente | Pular criação de épico; pedir `#N` |
| Breakdown do `planning-agent` | Converter T01…Tn 1:1 ou agrupar com justificativa |
| Issue GitHub vaga | Refinar em alto nível + nota "detalhar na implementação" |
| `gh` não autenticado | `gh auth login` — não fingir que publicou |
| Label inexistente | `gh label create` antes de criar/editar (inclui `pts-*`) |
| Conteúdo só backend | Labels `shared`/`api`/`worker` apenas |
| UI envolvida | Issues `web` e/ou `admin` separadas após contratos |

---

## 11. Princípios de qualidade

- **Direto e técnico** — skill para dev, não para leigos
- **Questione ambiguidades** — não inventar escopo vago
- **Não alucinar código** — citar paths reais ou sinalizar inferência
- **Preserve intenção original** — melhorar ≠ reescrever do zero
- **Anexos e links** — nunca remover silenciosamente (§5)
- **Arquitetura Play+:** DDD, monorepo, fila api↔worker, contratos em `shared`
- **Nenhuma alteração no GitHub sem confirmação** (§10)
- **Snapshot em comentário antes de editar** (§5.1)
- Commits/PRs: `feat(video): ... (#43)`

## Referência adicional

- Catálogo de superfícies, templates, comandos `gh`: [reference.md](reference.md)
- DoR e pontuação: [planning-agent/reference.md](../planning-agent/reference.md)
- Pipeline: [../FLUXO.md](../FLUXO.md)
