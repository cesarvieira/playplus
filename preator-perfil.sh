#!/usr/bin/env bash
# ============================================================================
# preator-perfil.sh — o CONTRATO entre o Play+ e a fábrica.
#
# É o único ponto de contato entre os dois lados: a fábrica não conhece pnpm,
# turbo, Nuxt ou Fastify — ela sabe que existe *um comando de build* e pergunta
# ao projeto qual é.
#
# Um gate que não encontra o que precisa reporta SKIP explícito — e SKIP de gate
# bloqueante rebaixa o veredito a PARCIAL, nunca vira PASS silencioso. Os campos
# que ficaram em branco aqui embaixo estão comentados COM O MOTIVO: são escolhas
# visíveis, não atalhos.
#
# Stack (docs/stack.md): monorepo pnpm + turbo — apps/api (Fastify + drizzle),
# apps/web e apps/admin (Nuxt 4), packages/shared (contrato de tipos) e
# packages/worker (BullMQ + ffmpeg).
# ============================================================================

# ---------------------------------------------------------------------------
# ONDE ESTE PROJETO GUARDA SEU OVERLAY
# ---------------------------------------------------------------------------
OVERLAY=".preator"

# ---------------------------------------------------------------------------
# BUILD  —  o gate mais básico: compila?
# ---------------------------------------------------------------------------
# Só o lado de trás: cada pacote roda `tsc -p tsconfig.build.json`, então erro
# de TIPO no back reprova aqui — é por isso que TYPECHECK_CMD, lá embaixo, cobre
# apenas os dois fronts (o Nuxt builda com typeCheck:false).
# Os fronts têm gate próprio (FRONT_BUILD); declarar `pnpm build` aqui faria
# `nuxt build` rodar duas vezes por veredito.
BUILD_CMD="pnpm --filter @playplus/shared --filter @playplus/api --filter @playplus/worker run build"

# ---------------------------------------------------------------------------
# TESTE  —  atenção: o gate EXIGE N>0 testes realmente executados
# ---------------------------------------------------------------------------
# ⚠️ O projeto ainda NÃO tem filtro de integração: `pnpm test` roda tudo o que
# existe (vitest em api, web, admin, shared e worker). As rotas do Fastify são
# exercitadas via `app.inject`, o que prova fiação de HTTP — mas banco, Valkey e
# storage são dublês. Ou seja: este gate não pega migration que não aplica nem
# dependência não registrada; quem pegaria é o sobe-e-roda, hoje indisponível
# (veja COMPOSE, mais abaixo). Quando existir suíte de integração, troque o
# comando por ela — não a esconda dentro do `test` de todo mundo.
#
# O `tee` existe por causa do TEST_COUNT_CMD: sem log em disco não há como
# contar sem rodar a suíte de novo. $MOTOR é o workspace local (.preator/tmp),
# já ignorado pelo git. Aspas SIMPLES de propósito — $MOTOR só passa a existir
# depois que o raiz.sh termina de carregar este arquivo.
TEST_CMD='mkdir -p "$MOTOR" && pnpm test 2>&1 | tee "$MOTOR/testes.log"'

# O contador nativo do gate não serve aqui: o vitest não imprime "N total" (ele
# imprime `Tests  350 passed (350)`), o turbo prefixa cada linha com o nome do
# pacote e mantém as cores mesmo em pipe. Sem isto o gate somava "arquivos de
# teste" junto com "testes" e reportava um N inflado — passava, mas mentindo o
# número. Aqui se soma o total entre parênteses de cada pacote.
TEST_COUNT_CMD='grep -a Tests "$MOTOR/testes.log" | grep -oE "\([0-9]+\)" | tr -cd "0-9\n" | awk "{s+=\$1} END {print s+0}"'

# ---------------------------------------------------------------------------
# FRONT  —  este projeto tem DOIS
# ---------------------------------------------------------------------------
# FRONT_DIR é um diretório só (é onde os gates entram, e onde o gate de contrato
# procura tipo redeclarado à mão): aponta para o front do produto. Já o build e
# o typecheck usam filtro por NOME de pacote — funcionam de qualquer cwd — e por
# isso cobrem os dois fronts, admin incluído.
FRONT_DIR="apps/web"
FRONT_BUILD="pnpm --filter @playplus/web --filter @playplus/admin run build"
TYPECHECK_CMD="pnpm --filter @playplus/web --filter @playplus/admin run typecheck"

# ---------------------------------------------------------------------------
# ESTÁTICO  —  o que se prova sem subir nada. Opcionais e NÃO-BLOQUEANTES:
# reprovam visivelmente na tabela do veredito, mas não derrubam o carimbo.
# ---------------------------------------------------------------------------
# Rodam da RAIZ do projeto, não de FRONT_DIR.
LINT_CMD="pnpm lint"     # scripts/lint.mjs: turbo run lint + eslint na raiz
DEADCODE_CMD="pnpm knip"

# ⚠️ Os hooks do projeto estão declarados aqui inteiros — nenhum portão local
# fica invisível para o gate mestre. São dois, ambos em `.githooks` (o husky
# foi removido; `core.hooksPath` é ligado pelo `prepare`, em
# scripts/ativar-githooks.mjs):
#   pre-commit → segredo (fábrica) + lint-staged + typecheck e test do delta
#   pre-push   → prettier nos arquivos do range + lint, typecheck, test e knip
#                do repositório inteiro
# A ÚNICA coisa do pre-push que não vira gate aqui é o `prettier --check`: ele é
# gateado por RANGE, porque `pnpm format:check` no repositório inteiro ainda
# acusa mais de mil arquivos de legado (docs, .github, overlay). Declará-lo em
# LINT_CMD pintaria a tabela de vermelho por dívida antiga, não pelo diff.

# ---------------------------------------------------------------------------
# SUBIR O SISTEMA  —  o gate que pega o que o build nunca vê
# ---------------------------------------------------------------------------
COMPOSE="docker-compose.yml"
API_PORT=3000
FRONT_PORT=3001                    # apps/web; o admin sobe em 3002

# Os dev servers escutam SÓ em loopback IPv4 (nuxt.config.ts: host 127.0.0.1).
# Escrever "localhost" aqui deixaria o curl do gate tentando ::1 primeiro no
# Windows — declaramos o IP para não depender do desempate do resolvedor.
API_BASE="http://127.0.0.1:$API_PORT"
FRONT_BASE="http://127.0.0.1:$FRONT_PORT"
# O acesso público é pelo Caddy, em https://api|web|admin.$APP_DOMAIN — os gates
# falam direto com o processo, sem TLS e sem proxy.

# STACK_UP_CMD / STACK_DOWN_CMD ficam FORA de propósito: o docker-compose.yml
# deste repositório sobe só INFRAESTRUTURA (postgres, valkey, minio, caddy). A
# API, o web e o admin rodam no host, via `pnpm dev`. Um `compose up` aqui não
# faria a API responder em $API_BASE — logo:
#   · o gate `sobe-e-roda` (--deploy) REPROVA por definição hoje, porque não
#     existe compose que suba o sistema inteiro do zero;
#   · os gates `contrato` e `navegacao` exigem a stack de pé ANTES: suba
#     `docker compose up -d` e `pnpm dev`, e só então chame o gate mestre.
# Quando existir um compose com api/web/admin dentro — e em portas próprias,
# para não colidir com o dev que já está no ar —, declare aqui:
# STACK_UP_CMD="docker compose -f docker-compose.teste.yml -p playplus-teste up -d --build"
# STACK_DOWN_CMD="docker compose -f docker-compose.teste.yml -p playplus-teste down -v"

# ---------------------------------------------------------------------------
# UPGRADE COM DADO  —  o outro lado do "sobe do zero"
# ---------------------------------------------------------------------------
# Este gate precisa só do POSTGRES — que o compose acima entrega. É, hoje, a
# única prova de deploy que o projeto consegue dar, e por isso está declarada.
#
# O migrate roda DUAS vezes: uma dentro de um worktree do commit-base (o schema
# de ontem) e outra no HEAD. O worktree nasce sem node_modules e sem .env — daí
# o `pnpm install` e a leitura do DATABASE_URL a partir do .env do projeto (o
# perfil não guarda a string de conexão; ele só diz onde ela mora).
# É `drizzle-kit migrate` puro, e não o script `db:migrate` do package.json:
# aquele encadeia o seed, e semear no meio da medição mudaria as contagens que
# este gate compara.
UPGRADE_MIGRATE_CMD='export DATABASE_URL="$(grep -E "^DATABASE_URL=" "$PROJETO/.env" | tail -1 | cut -d= -f2-)"; pnpm install --frozen-lockfile --prefer-offline --silent && pnpm --filter @playplus/api exec drizzle-kit migrate'

# ⚠️ Dado representativo é o que falta: o seed de hoje cria só o usuário admin.
# A prova cobre `users` de verdade e `videos` apenas como "a tabela continua
# lá". Um seed com vídeo, categoria e taxonomia tornaria este gate capaz de
# pegar migration que apaga conteúdo.
UPGRADE_SEED_CMD="pnpm --filter @playplus/api run db:seed"

# Contagens no formato chave=valor, uma por linha. Roda dentro do contêiner do
# postgres (socket local, sem senha e sem credencial no perfil).
# Só entram aqui tabelas ANTIGAS: uma tabela criada na branch não existe no
# schema-base, o psql erraria a query inteira e o gate reprovaria por contagem
# vazia — vermelho que não seria sobre perda de dado.
UPGRADE_CONTAGEM_CMD="docker compose -f $COMPOSE exec -T postgres psql -U playplus -d playplus -Atc \"select 'users='||count(*) from users union all select 'videos='||count(*) from videos\""

# De onde vem o schema "de ontem": sem declarar, é o merge-base com main — que é
# o certo aqui, porque toda história sai de uma branch a partir de main.
# UPGRADE_BASE_REF="origin/main"

# ---------------------------------------------------------------------------
# CONTRATO  —  o front importa o tipo, não redeclara o modelo do back
# ---------------------------------------------------------------------------
# ⚠️ A API não publica OpenAPI: o Fastify sobe sem @fastify/swagger, e o
# contrato entre os lados hoje é o pacote @playplus/shared — DTOs e enums moram
# lá e os dois lados IMPORTAM, que é o mesmo princípio ("modela uma vez") por
# outro meio.
# O gate, porém, só sabe ler uma spec por HTTP e não tem SKIP para "projeto sem
# spec": enquanto não houver uma, ele REPROVA por conexão recusada. Publicar
# /v1/openapi.json (@fastify/swagger, enum como string) e descomentar a linha
# abaixo é o que fecha esse buraco.
# OPENAPI_URL="http://127.0.0.1:$API_PORT/v1/openapi.json"

# ---------------------------------------------------------------------------
# NAVEGAÇÃO  —  a prova de que a tela ABRE, não de que compila
# ---------------------------------------------------------------------------
# ⚠️ Sem crawler declarado o gate reporta SKIP (a versão pinada da fábrica não
# traz o crawler genérico), e SKIP de bloqueante rebaixa o veredito a PARCIAL —
# que é o veredito honesto: `nuxt build` verde não prova que a tela renderiza.
# O crawler é do projeto porque só ele conhece as rotas (web e admin), o login
# por cookie e o SSR. Quando existir, declare:
# CRAWL_CMD="node scripts/crawl-gate.mjs"
MAX_QUEBRADAS=0

# ---------------------------------------------------------------------------
# ONDE VIVEM SPEC E BOARD  —  usados pelos workflows
# ---------------------------------------------------------------------------
ESPEC_DIR=".preator/especificacoes"
# A fila de histórias é o GitHub Issues (.github/ISSUE_TEMPLATE), não um board
# em disco — por isso BOARD fica sem declarar.
# BOARD="docs/BOARD.md"

# ---------------------------------------------------------------------------
# ⛔ O QUE NÃO ENTRA AQUI
# ---------------------------------------------------------------------------
# Credencial, token, senha, string de conexão. Nada disso — nem as do .env, que
# é lido por caminho quando algum gate precisa.
# O gate de navegação lê usuário de teste de PREATOR_TEST_USER e
# PREATOR_TEST_PASS no AMBIENTE — e, se não achar, diz no veredito que não
# cobriu a área logada em vez de fingir que cobriu.
