// Liga o portão local: aponta core.hooksPath para .githooks, onde mora o único
// pre-commit do projeto (segredo + lint-staged + typecheck + test + knip).
//
// Roda no `prepare`, ou seja, a cada `pnpm install`. Era o que o husky fazia —
// e é o passo que costuma faltar: hook que existe no repositório mas não está
// apontado nunca roda, e um portão que depende de alguém lembrar de ligar não
// é portão.
//
// Falha em silêncio de propósito (o `prepare` termina com `|| exit 0`): install
// sem git, sem a pasta de hooks ou em CI não pode quebrar por causa disto.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const HOOKS_DIR = '.githooks';

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });

if (git('rev-parse', '--git-dir').status !== 0) {
  process.exit(0); // não é um repositório git (tarball, container de build)
}

if (!existsSync(HOOKS_DIR)) {
  process.exit(0); // nada para apontar
}

const atual = git('config', '--get', 'core.hooksPath').stdout.trim();

if (atual === HOOKS_DIR) {
  process.exit(0); // já ligado — o caso normal, e sem ruído no install
}

const resultado = git('config', 'core.hooksPath', HOOKS_DIR);

if (resultado.status !== 0) {
  process.stderr.write(`Não consegui apontar core.hooksPath para ${HOOKS_DIR}.\n`);
  process.exit(1);
}

process.stdout.write(
  `core.hooksPath -> ${HOOKS_DIR}${atual ? ` (era "${atual}")` : ''}\n`,
);
