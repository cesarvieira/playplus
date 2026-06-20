import { spawnSync } from 'node:child_process';

const run = (command) => {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('pnpm exec lint-staged');
run('pnpm exec turbo run typecheck --filter=...[HEAD]');
run('pnpm exec turbo run test --filter=...[HEAD]');
run('pnpm knip');
