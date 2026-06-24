import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.shared.mjs';

export default defineConfig(
  { ignores: ['dist/**'] },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
