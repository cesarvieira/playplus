import { spawnSync } from 'node:child_process';

const changedOnly = process.argv.includes('--changed');

const run = (command) => {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const turboLint = changedOnly
  ? 'pnpm exec turbo run lint --filter=...[HEAD]'
  : 'pnpm exec turbo run lint';

run(turboLint);
run('pnpm exec eslint . --max-warnings 0');
