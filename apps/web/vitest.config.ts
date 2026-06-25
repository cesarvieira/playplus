import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';
import shared from '../../vitest.shared.nuxt.ts';

const webRoot = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  shared,
  defineConfig({
    resolve: {
      alias: {
        '~': resolve(webRoot, 'app'),
      },
    },
    test: {
      name: '@playplus/web',
    },
  }),
);
