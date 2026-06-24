import { defineConfig, mergeConfig } from 'vitest/config';
import shared from '../../vitest.shared.node.ts';

export default mergeConfig(
  shared,
  defineConfig({
    resolve: {
      conditions: ['development'],
    },
    test: {
      name: '@playplus/api',
      setupFiles: ['./src/test/setup-env.ts'],
    },
  }),
);
