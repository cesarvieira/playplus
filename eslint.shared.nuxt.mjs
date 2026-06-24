import baseConfig from './eslint.shared.mjs';
import eslintPluginVue from 'eslint-plugin-vue';
import stylistic from '@stylistic/eslint-plugin';

/**
 * Anexa a configuração ESLint compartilhada da raiz ao composer gerado pelo Nuxt.
 *
 * @param {import('eslint-flat-config-utils').FlatConfigComposer} composer
 * @returns {import('eslint-flat-config-utils').FlatConfigComposer}
 */
export function withNuxtBase(composer) {
  return composer
    .prepend(eslintPluginVue.configs['flat/recommended'])
    .prepend(...baseConfig)
    .append({
      plugins: {
        '@stylistic': stylistic,
      },
      rules: {
        '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
        '@stylistic/eol-last': ['error', 'always'],
        '@stylistic/linebreak-style': ['error', 'unix'],
        '@stylistic/no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
        '@stylistic/member-delimiter-style': [
          'error',
          {
            multiline: {
              delimiter: 'semi',
              requireLast: true,
            },
            singleline: {
              delimiter: 'semi',
              requireLast: false,
            },
            multilineDetection: 'brackets',
          },
        ],
        '@stylistic/operator-linebreak': [
          'error',
          'after',
          {
            overrides: {
              '?': 'before',
              ':': 'before',
            },
          },
        ],
        '@stylistic/semi': ['error', 'always'],
      },
    })
    .override('nuxt/rules', {
      rules: {
        'vue/html-self-closing': [
          'error',
          {
            html: {
              void: 'never',
              normal: 'never',
              component: 'always',
            },
            svg: 'always',
            math: 'always',
          },
        ],
        'vue/component-name-in-template-casing': [
          'error',
          'PascalCase',
          {
            registeredComponentsOnly: false,
          },
        ],
        'vue/html-indent': [
          'error',
          2,
          {
            attribute: 1,
            baseIndent: 1,
            closeBracket: 0,
            alignAttributesVertically: true,
          },
        ],
        'vue/max-attributes-per-line': [
          'error',
          {
            singleline: 4,
            multiline: 1,
          },
        ],
        'vue/object-property-newline': [
          'error',
          {
            allowAllPropertiesOnSameLine: true,
          },
        ],
        'vue/operator-linebreak': ['off'],
        'vue/quote-props': ['error', 'as-needed'],
        'vue/singleline-html-element-content-newline': ['off'],
        'vue/valid-v-slot': ['error', { allowModifiers: true }],
        'vue/max-len': [
          'error',
          {
            code: 120,
            ignoreUrls: true,
            ignoreHTMLAttributeValues: true,
          },
        ],
      },
    });
}
