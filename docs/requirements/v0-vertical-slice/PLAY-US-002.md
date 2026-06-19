# PLAY-US-002 — Contratos compartilhados em packages/shared

**Como** desenvolvedor do monorepo  
**Quero** tipos, DTOs, enums e erros compartilhados entre api, worker e frontends  
**Para** garantir contratos consistentes sem import entre apps

**Pilar:** Aprendizado contínuo  
**Agregado(s):** User, Video  
**Superfície:** `packages/shared`  
**Rastreabilidade:** Business Case v0 — bootstrap monorepo; `.cursorrules` regras de dependência

## Critérios de Aceite

- [ ] Dado o pacote `packages/shared`, quando inspeciono seu conteúdo, então contém tipos `Video` e `User`, enums `VideoStatus` e `UserRole`, DTOs `CreateVideoDto` e erros tipados (`VideoNotFoundError`, `UnauthorizedError`, etc.)
- [ ] Dado um tipo exportado de `shared`, quando `apps/api`, `apps/web`, `apps/admin` ou `packages/worker` o importam, então a compilação TypeScript passa sem import cruzado entre apps
- [ ] Dado o pacote `shared`, quando verifico dependências, então não há dependências externas de runtime (sem Fastify, sem Vue, sem FFmpeg)
- [ ] Dado `VideoStatus`, quando comparo com `docs/api.md`, então inclui pelo menos `pending`, `queued`, `processing`, `ready` e `error`

## Requisitos Não-Funcionais

- Performance: n/a
- Segurança: DTOs não expõem campos sensíveis (ex.: hash de senha) em respostas públicas
- Acessibilidade: n/a

## Dependências

- PLAY-US-001 (monorepo bootstrap mínimo — `pnpm-workspace.yaml`, `turbo.json`)

## Riscos

- Enum `VideoStatus` divergente entre REST e WebSocket — alinhar com `docs/api.md` antes da implementação
