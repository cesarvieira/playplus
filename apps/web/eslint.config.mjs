import withNuxt from './.nuxt/eslint.config.mjs';
import { withNuxtBase } from '../../eslint.shared.nuxt.mjs';

/** @type {import('eslint-flat-config-utils').FlatConfigComposer} */
const eslintConfig = withNuxtBase(withNuxt()).prepend({
  ignores: ['mockups/**', 'dist/**', '**/*.json', '**/*.md'],
});

export default eslintConfig;
