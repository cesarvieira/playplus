import stylistic from '@stylistic/eslint-plugin';

import {
  javascriptRules,
  stylisticRules,
  typescriptTypedRules,
  vueRules,
} from './eslint.shared.rules.mjs';

const nuxtSourceFiles = ['**/*.{ts,tsx,mjs,cjs}', '**/*.vue'];

/**
 * Anexa regras compartilhadas ao composer gerado pelo Nuxt.
 * Não registra plugins vue/typescript-eslint — o @nuxt/eslint já os fornece.
 *
 * @param {import('eslint-flat-config-utils').FlatConfigComposer} composer
 * @returns {import('eslint-flat-config-utils').FlatConfigComposer}
 */
export function withNuxtBase(composer) {
  return composer
    .append({
      files: nuxtSourceFiles,
      plugins: {
        '@stylistic': stylistic,
      },
      rules: {
        ...stylisticRules,
        ...javascriptRules,
      },
    })
    .append({
      files: ['**/*.{ts,tsx}'],
      rules: typescriptTypedRules,
    })
    .override('nuxt/rules', {
      rules: vueRules,
    });
}
