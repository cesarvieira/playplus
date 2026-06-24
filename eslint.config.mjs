import { defineConfig } from 'eslint/config';
import baseConfig from './eslint.shared.mjs';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/config-helpers';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  {
    ignores: ['apps/**', 'packages/**'],
  },
  ...baseConfig,
);
