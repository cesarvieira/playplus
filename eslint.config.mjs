import tsEslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import js from '@eslint/js';
import eslintPluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import vueEslintParser from 'vue-eslint-parser';
import { createConfigForNuxt } from '@nuxt/eslint-config';
import stylistic from '@stylistic/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';

const toolingFiles = [
  'eslint.config.mjs',
  '**/*.config.{js,mjs,cjs,ts}',
  'vitest.shared.node.ts',
  'vitest.shared.nuxt.ts',
  'packages/worker/**/*.ts',
];

const enumFilePatterns = ['**/enums/**/*.ts'];

const promiseRestrictedSyntax = [
  {
    selector: 'CallExpression[callee.property.name=\'then\']',
    message: 'Use async/await instead of Promise.then()',
  },
  {
    selector: 'CallExpression[callee.property.name=\'catch\']',
    message: 'Use try/catch with await instead of Promise.catch()',
  },
  {
    selector: 'CallExpression[callee.property.name=\'finally\']',
    message: 'Use finally within try/catch/finally, not Promise.finally()',
  },
];

const enumConstRestrictedSyntax = {
  selector: 'VariableDeclarator > Identifier[name=/^[A-Z][a-z][a-zA-Z0-9]*$/]',
  message:
    'Constantes de enum devem usar UPPER_CASE (ex.: ERROR_CODE, não ErrorCode).',
};

const namingConventionBase = [
  {
    selector: 'default',
    format: ['camelCase'],
    leadingUnderscore: 'allow',
  },
  {
    selector: 'variable',
    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
    leadingUnderscore: 'allow',
  },
  {
    selector: 'function',
    format: ['camelCase', 'PascalCase'],
  },
  {
    selector: 'enum',
    format: ['UPPER_CASE'],
  },
  {
    selector: 'enumMember',
    format: ['UPPER_CASE'],
  },
  {
    selector: 'typeAlias',
    format: ['PascalCase', 'UPPER_CASE'],
  },
  {
    selector: 'typeLike',
    format: ['PascalCase'],
  },
  {
    selector: 'parameter',
    format: ['camelCase'],
    leadingUnderscore: 'allow',
  },
  {
    selector: ['property', 'objectLiteralMethod'],
    format: null,
  },
  {
    selector: 'import',
    format: null,
  },
];

const namingConventionEnumFiles = [
  ...namingConventionBase.filter((rule) => rule.selector !== 'variable'),
  {
    selector: 'variable',
    format: ['UPPER_CASE'],
    leadingUnderscore: 'allow',
  },
  {
    selector: 'objectLiteralProperty',
    format: ['UPPER_CASE'],
  },
];

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/*.d.ts',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/coverage/**',
  ]),
  js.configs.recommended,
  ...tsEslint.configs.strict,
  ...tsEslint.configs.stylistic,
  ...(
    await createConfigForNuxt({
      features: {
        standalone: true,
        typescript: true,
        recommended: true,
        stylistic: true,
      },
    })
  ),
  ...eslintPluginVue.configs['flat/recommended'],
  ...defineConfigWithVueTs(vueTsConfigs.recommended),
  stylistic.configs.customize({
    quoteProps: 'as-needed',
    commaDangle: 'always-multiline',
  }),
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'vitest.config.ts',
      'vitest.shared.node.ts',
      'vitest.shared.nuxt.ts',
      '**/*.config.ts',
      'packages/*/vitest.config.ts',
    ],
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueEslintParser.parser,
      parserOptions: {
        parser: tsEslint.parser,
        projectService: true,
      },
    },
    rules: {
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          registeredComponentsOnly: false,
        },
      ],
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
        },
      ],
    },
  },
  {
    rules: {
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignorePattern: 'd="([\\s\\S]*?)"',
        },
      ],
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
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'max-params': ['error', 4],
      'no-console': 'error',
      'no-debugger': 1,
      'no-restricted-syntax': ['error', ...promiseRestrictedSyntax],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },
  {
    ignores: enumFilePatterns,
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        ...namingConventionBase,
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
      ],
    },
  },
  {
    files: [
      'app/layouts/**/*.vue',
      'app/pages/**/*.vue',
    ],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: [
      'app/**/*.spec.ts',
      'app/**/*.unit.spec.ts',
    ],
    ...vitest.configs.recommended,
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: true,
      },
      globals: vitest.environments.env.globals,
    },
  },
  {
    files: ['vitest.config.ts', 'vitest.shared.node.ts', 'vitest.shared.nuxt.ts'],
    ...vitest.configs.recommended,
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: vitest.environments.env.globals,
    },
  },
  {
    files: toolingFiles,
    rules: { 'no-console': 'off' },
  },
  eslintConfigPrettier,
  {
    files: enumFilePatterns,
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        ...namingConventionEnumFiles,
      ],
      'no-restricted-syntax': [
        'error',
        ...promiseRestrictedSyntax,
        enumConstRestrictedSyntax,
      ],
    },
  },
);
