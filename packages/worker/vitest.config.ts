import { defineConfig, mergeConfig } from 'vitest/config';
import shared from '../../vitest.shared.node.ts';

export default mergeConfig(
  shared,
  defineConfig({
    test: {
      name: '@playplus/worker',
      setupFiles: ['./src/test/setup-env.ts'],
    },
  }),
);
