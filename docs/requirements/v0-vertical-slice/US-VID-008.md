# US-VID-008 — Catálogo de vídeos prontos na web

**Como** Viewer registrado  
**Quero** ver a lista de vídeos disponíveis para assistir  
**Para** escolher o que reproduzir no meu espaço privado

**Pilar:** Histórias organizadas  
**Agregado(s):** Video  
**Superfície:** `apps/web`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério #3; Problem Statement — reunir filmes fora de plataformas comerciais

## Critérios de Aceite

- [ ] Dado que estou autenticado na web, quando acesso a home/catálogo, então vejo grid ou lista de vídeos com `status: ready`
- [ ] Dado catálogo carregado, quando clico em um vídeo, então navego para página de detalhe/reprodução (`/[id]` ou equivalente)
- [ ] Dado vídeos em `processing` ou `error`, quando visualizo catálogo viewer, então **não** aparecem na listagem padrão (filtro `status=ready`)
- [ ] Dado catálogo vazio, quando não há vídeos prontos, então vejo estado vazio claro ("Nenhum vídeo disponível")
- [ ] Dado vídeo sem thumbnail (v0), quando exibo card, então placeholder visual substitui capa sem quebrar layout

## Requisitos Não-Funcionais

- Performance: primeira render do catálogo (SSR ou CSR) em ≤ 2 s com até 50 vídeos
- Segurança: catálogo inacessível sem login
- Acessibilidade: cards clicáveis com nome do vídeo visível; contraste WCAG 2.1 AA; navegação por teclado entre itens

## Dependências

- US-USR-003 (login web)
- US-VID-006 (GET /videos)

## Riscos

- Nenhum significativo — US de escopo médio
