# Discovery Agent — Referência Play+

Material de apoio para análises de discovery. Fonte de verdade completa: `.cursorrules`, `docs/api.md`, `docs/stack.md`.

**Fluxo de agentes:** [../FLUXO.md](../FLUXO.md) — esta skill é a **fase 01**; handoff de saída → `strategy-agent`.

---

## Personas emergentes (seeds para análise)

Use como ponto de partida — personas finais devem emergir das entrevistas, não desta tabela.

| Persona               | Perfil                                                       | Jobs típicos                                                                         |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Admin/Dono**        | Configura VPS, faz upload, gerencia catálogo e usuários      | Organizar biblioteca, subir episódios, saber quando vídeo está pronto                |
| **Viewer registrado** | Conta criada pelo admin, acessa com credencial no `apps/web` | Retomar de onde parou, encontrar o próximo episódio, player confiável, login simples |

Ao consolidar personas nas entrevistas, indique role (`viewer` / admin) e frequência de uso (esporádico ou regular) quando houver evidência — frequência é atributo do viewer registrado, não persona separada.

---

## Domínios de dor (checklist para pattern matching)

Agrupados pelos pilares do Play+. Para critérios estratégicos completos, ver [strategy-agent/reference.md](../strategy-agent/reference.md).

| Pilar                     | Domínios de dor comuns                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **Histórias organizadas** | Catálogo confuso, metadados faltando, busca inexistente, séries/episódios desorganizados         |
| **Experiências simples**  | Player instável, buffering, seek impreciso, retomada quebrada, progresso perdido                 |
| **Privacidade**           | Acesso indevido, cadastro de viewers difícil, medo de expor biblioteca, sessão insegura          |
| **Liberdade**             | Features desnecessárias, complexidade que não serve uso pessoal, pedidos de billing/multi-tenant |
| **Aprendizado contínuo**  | Fricção aceitável se trouxer valor técnico ao dono (ex.: pipeline HLS, observabilidade)          |

---

## Mapa insight → agregado

| Sintoma comum                          | Agregado provável          | Superfície típica                        |
| -------------------------------------- | -------------------------- | ---------------------------------------- |
| "Perdi onde parei"                     | WatchSession               | `apps/web` + WebSocket `player.progress` |
| "Não acho o episódio"                  | Video (metadados/catálogo) | `apps/web` + `apps/admin`                |
| "Upload demorou / não sei se terminou" | Video + worker             | `apps/admin` + WebSocket `video.status`  |
| "Vídeo não carrega / trava"            | Video (HLS/CDN)            | `apps/web` + `packages/worker` + CDN     |
| "Não consigo entrar / sessão expira"   | User                       | `apps/web` + `apps/api` (JWT/refresh)    |
| "Quero cadastrar um viewer"            | User                       | `apps/admin` (gestão de usuários)        |

Ao mapear, indique se a dor é de **viewer** ou **admin** — evita misturar jobs de superfícies diferentes.

---

## Exemplos de JTBD (formato guia)

Use o formato: **"Quando [situação], quero [motivação], para [resultado esperado]"**

**Viewer — retomada:**

> Quando volto dias depois para continuar uma série, quero retomar automaticamente do ponto exato em que parei, para não perder tempo procurando o episódio e o minuto certo.

**Viewer — catálogo:**

> Quando abro o Play+, quero ver rapidamente o que estou assistindo e o que vem a seguir, para decidir o que ver sem navegar por dezenas de itens desorganizados.

**Admin — upload:**

> Quando termino de enviar um arquivo grande, quero saber com clareza quando o vídeo estará pronto para assistir, para não ficar checando manualmente se a transcodificação acabou.

Substitua por JTBDs derivados das citações reais das entrevistas — estes são apenas ilustrações.

---

## Handoff para Strategy Agent

Quando o Problem Statement estiver consolidado (evidência suficiente, causa raiz validada, pilar e agregado mapeados), indique ao usuário invocar a skill `strategy-agent` passando o Problem Statement como input.

A Strategy Agent transformará o PS em Business Case com viabilidade técnica, esforço e recomendação go/no-go/defer.

**Próximo agente:** `strategy-agent` — ver pipeline em [../FLUXO.md](../FLUXO.md).

**O que enviar à Strategy Agent:**

- Problem Statement completo
- Pilar e agregado vinculados
- Citações ou evidências que sustentam a dor
- Persona afetada (viewer / admin)

A Strategy Agent usará o campo **Problema** do Business Case a partir do PS — não é necessário reescrever a dor.
