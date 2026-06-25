import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDevTlsHttps, resolveWebSiteUrl } from './dev-tls';

const webRoot = dirname(fileURLToPath(import.meta.url));
const sharedEntry = resolve(webRoot, '../../packages/shared/src/index.ts');
const devTlsHttps = loadDevTlsHttps();
const publicApiUrl = process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
  ],
  app: {
    head: {
      title: 'Play+',
    },
  },
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiUrl: publicApiUrl,
      /** URL canônica deste app (viewer). Override: NUXT_PUBLIC_WEB_URL. */
      siteUrl: resolveWebSiteUrl(),
    },
  },
  srcDir: 'app',
  alias: {
    '@playplus/shared': sharedEntry,
  },
  devServer: {
    port: 3001,
    ...(devTlsHttps
      ? {
          host: 'web.playplus.localhost',
          https: devTlsHttps,
        }
      : {}),
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    typescript: {
      tsConfig: {
        extends: '../../../tsconfig.base.json',
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      extends: '../../../tsconfig.base.json',
      include: ['../*.{ts,mjs}'],
    },
    sharedTsConfig: {
      extends: '../../../tsconfig.base.json',
    },
    nodeTsConfig: {
      extends: '../../../tsconfig.base.json',
      include: ['../*.ts', '../*.mjs'],
    },
  },
  eslint: {
    checker: true,
    config: {
      formatters: {
        html: true,
        css: true,
        svg: true,
      },
    },
  },
  vite: {
    server: {
      strictPort: true,
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
  googleFonts: {
    families: {
      'Plus Jakarta Sans': [400, 500, 600, 700, 800],
      'JetBrains Mono': [400, 500, 600],
    },
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },
});
