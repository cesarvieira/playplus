import { defineConfig, mergeConfig } from 'vitest/config';
import shared from '../../vitest.shared.nuxt.ts';

export default mergeConfig(
  shared,
  defineConfig({
    test: {
      name: '@playplus/admin',
      environment: 'node',
      include: ['app/**/*.unit.spec.ts'],
      coverage: {
        include: ['app/utils/**/*.ts'],
      },
    },
  }),
);
