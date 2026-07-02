# Play+ Dev Framework — Fluxo de Agentes

Referência cruzada entre skills. Domínio e arquitetura: `AGENTS.md`, `docs/api.md`, `docs/stack.md`.

---

## Pipeline canônico

```
Entrevistas / demanda
  ↓
discovery-agent        insights, JTBD, Problem Statement
  ↓
strategy-agent         business case — go | no-go | defer
  ↓                      [no-go → encerra]
requirements-agent     user stories, critérios de aceite
  ↓
ux-agent               *se apps/web ou apps/admin*
  ↓
architect-agent        *se decisão arquitetural pendente*
  ↓
planning-agent         breakdown, DoR, estimativas
  ↓
gerar-task             *opcional — publicar breakdown ou refinar issue no GitHub*
  ↓
dev-agent              implementação
  ↓
entrega
```

---

## Mapa de skills

| Fase | Skill                                             | Entrada típica                                 | Handoff de saída                                    |
| ---- | ------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| 01   | [discovery-agent](discovery-agent/SKILL.md)       | entrevistas, notas, feedback                   | `strategy-agent` (Problem Statement)                |
| 02   | [strategy-agent](strategy-agent/SKILL.md)         | PS, demanda, ideia de feature                  | `requirements-agent` (go/defer)                     |
| 03   | [requirements-agent](requirements-agent/SKILL.md) | Business Case aprovado                         | `ux-agent` ou `architect-agent` ou `planning-agent` |
| 04   | [ux-agent](ux-agent/SKILL.md)                     | US com UI                                      | `architect-agent` ou `planning-agent`               |
| 05   | [architect-agent](architect-agent/SKILL.md)       | US, proposta técnica, spike                    | `planning-agent` (ou retorno a requirements/ux)     |
| 06   | [planning-agent](planning-agent/SKILL.md)         | US aprovadas + DoR satisfeito                  | `gerar-task` (opcional) ou `dev-agent`              |
| 06b  | [gerar-task](gerar-task/SKILL.md)                 | breakdown aprovado, US/SPEC ou issue a refinar | `dev-agent` (issues GitHub + ordem)                 |
| 07   | [dev-agent](dev-agent/SKILL.md)                   | tasks, bugfix, refatoração                     | entrega (código, testes, commits)                   |

---

## Atalhos (pular fases)

| Situação                                            | Caminho                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| Bugfix ou spike já validado                         | `dev-agent` direto                               |
| US puramente backend, sem decisão arquitetural nova | requirements → planning → dev                    |
| US com UI, sem decisão arquitetural nova            | requirements → ux → planning → dev               |
| Contrato cross-app, pipeline ou módulo DDD novo     | requirements/ux → architect → planning → dev     |
| Breakdown aprovado → issues no GitHub               | planning → `gerar-task` → dev                    |
| Strategy **no-go**                                  | encerra — revisar discovery ou descartar demanda |

---

## Referências compartilhadas (evitar duplicação)

| Tópico                                        | Fonte canônica                                                     |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Personas                                      | [discovery-agent/reference.md](discovery-agent/reference.md)       |
| Pilares e matriz de esforço                   | [strategy-agent/reference.md](strategy-agent/reference.md)         |
| Anti-patterns arquiteturais                   | [architect-agent/reference.md](architect-agent/reference.md)       |
| Red flags UX                                  | [ux-agent/reference.md](ux-agent/reference.md)                     |
| Critérios de quebra de US                     | [requirements-agent/reference.md](requirements-agent/reference.md) |
| DoR, estimativas e spikes                     | [planning-agent/reference.md](planning-agent/reference.md)         |
| SPEC/US → GitHub Issues; refinamento de tasks | [gerar-task/SKILL.md](gerar-task/SKILL.md)                         |
| Padrões de código e checklist                 | [dev-agent/reference.md](dev-agent/reference.md)                   |
| Componentes UI planejados                     | `docs/folder-structure.md`                                         |
| Pipeline HLS / contratos REST-WS              | `AGENTS.md`, `docs/api.md`                                      |
