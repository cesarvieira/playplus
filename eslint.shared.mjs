import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/config-helpers';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import json from '@eslint/json';

import { stylisticRules, typescriptRules } from './eslint.shared.rules.mjs';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

/** @type {import('eslint').Linter.Config} */
export const gitignoreConfig = includeIgnoreFile(gitignorePath);

export default defineConfig(
  gitignoreConfig,
  eslintConfigPrettier,
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
  },
  stylistic.configs.customize({
    quoteProps: 'as-needed',
    commaDangle: 'always-multiline',
  }),
  {
    files: ['**/*.{ts,tsx}', '*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vitest.config.ts', 'drizzle.config.ts'],
          defaultProject: 'tsconfig.json',
        },
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,mjs,cjs}', '*.{ts,tsx,mjs,cjs}'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      ...stylisticRules,
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}', '*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: typescriptRules,
  },
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.jsonc', '.vscode/*.json'],
    plugins: { json },
    language: 'json/jsonc',
    extends: ['json/recommended'],
  },
);
