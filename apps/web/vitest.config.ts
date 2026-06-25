import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineVitestConfig } from '@nuxt/test-utils/config';

const webRoot = dirname(fileURLToPath(import.meta.url));

export default defineVitestConfig({
  resolve: {
    alias: {
      '#server': resolve(webRoot, 'server'),
      '~': resolve(webRoot, 'app'),
    },
  },
  test: {
    name: '@playplus/web',
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        rootDir: webRoot,
      },
    },
    pool: 'forks',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      include: [
        'app/utils/**/*.ts',
        'app/composables/**/*.ts',
        'app/middleware/**/*.ts',
        'app/plugins/**/*.ts',
        'server/utils/**/*.ts',
      ],
      exclude: [
        'app/**/tests/**',
        'server/**/tests/**',
        '**/*.spec.ts',
      ],
    },
    include: ['app/**/tests/**/*.{test,spec}.ts', 'server/**/tests/**/*.{test,spec}.ts'],
  },
});
