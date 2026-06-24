import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';
import shared from '../../vitest.shared.nuxt.ts';

const adminRoot = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  shared,
  defineConfig({
    resolve: {
      alias: {
        '#server': resolve(adminRoot, 'server'),
      },
    },
    test: {
      name: '@playplus/admin',
      include: ['app/**/tests/**/*.spec.ts', 'server/**/tests/**/*.spec.ts'],
      coverage: {
        include: [
          'app/utils/**/*.ts',
          'security-headers.ts',
          'server/utils/session.ts',
          'server/utils/delegation-jwt.ts',
        ],
        exclude: [
          'app/**/tests/**',
          '**/*.spec.ts',
          'app/utils/api-client.ts',
          'app/utils/api-client.server.ts',
          'app/utils/api-fetch.ts',
          'app/utils/session-bridge.ts',
          'app/utils/session-cookie.ts',
        ],
      },
    },
  }),
);
