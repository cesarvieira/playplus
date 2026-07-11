import withNuxt from './.nuxt/eslint.config.mjs';
import { gitignoreConfig } from '../../eslint.shared.mjs';
import { withNuxtBase } from '../../eslint.shared.nuxt.mjs';

/** @type {import('eslint-flat-config-utils').FlatConfigComposer} */
const eslintConfig = withNuxtBase(withNuxt()).prepend(gitignoreConfig, {
  ignores: ['mockups/**', 'dist/**', '**/*.json', '**/*.md', '**/vitest.config.ts'],
});

export default eslintConfig;
