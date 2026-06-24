import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.shared.mjs';

export default defineConfig(
  { ignores: ['dist/**'] },
  {
    files: ['**/*.ts'],
  },
  ...baseConfig,
);
