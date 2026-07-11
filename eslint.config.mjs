import { defineConfig } from 'eslint/config';
import baseConfig from './eslint.shared.mjs';

export default defineConfig(
  {
    ignores: [
      'apps/**',
      'packages/**',
      '.agents/**',
      'docs/**',
      '**/*.md',
      '**/*.{yml,yaml}',
      'pnpm-lock.yaml',
    ],
  },
  ...baseConfig,
);
