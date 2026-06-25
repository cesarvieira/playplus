import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDevTlsHttps } from './dev-tls';
import { createSecurityHeaders } from './security-headers';

const adminRoot = dirname(fileURLToPath(import.meta.url));
const sharedEntry = resolve(adminRoot, '../../packages/shared/src/index.ts');
const devTlsHttps = loadDevTlsHttps();
const isDev = process.env.NODE_ENV !== 'production';
const securityHeaders = createSecurityHeaders(isDev);

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    'nuxt-security',
  ],
  app: {
    head: {
      title: 'Play+ Admin',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [{ name: 'theme-color', content: '#e89b8e' }],
    },
  },
  devtools: { enabled: true },
  runtimeConfig: {
    m2mServiceToken: process.env.M2M_SERVICE_TOKEN ?? '',
    delegationJwtSecret: process.env.DELEGATION_JWT_SECRET ?? '',
    jwtSecret: process.env.JWT_SECRET ?? '',
    delegationJwtTtlSeconds: Number(process.env.DELEGATION_JWT_TTL_SECONDS ?? 60),
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/v1/ws',
      webUrl: process.env.NUXT_PUBLIC_WEB_URL ?? 'http://localhost:3001',
    },
  },
  security: {
    nonce: !isDev,
    removeLoggers: isDev,
    rateLimiter: false,
    xssValidator: false,
    corsHandler: false,
    csrf: false,
    headers: securityHeaders,
  },
  srcDir: 'app',
  alias: {
    '@playplus/shared': sharedEntry,
  },
  devServer: {
    port: 3001,
    ...(devTlsHttps
      ? {
          host: 'admin.playplus.localhost',
          https: devTlsHttps,
        }
      : {}),
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    typescript: {
      // customize tsconfig.server.json
      tsConfig: {
        extends: '../../../tsconfig.base.json',
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
    // customize tsconfig.app.json
    tsConfig: {
      extends: '../../../tsconfig.base.json',
      include: ['../*.{ts,mjs}'],
    },
    // customize tsconfig.shared.json
    sharedTsConfig: {
      extends: '../../../tsconfig.base.json',
    },
    // customize tsconfig.node.json
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
    optimizeDeps: {
      include: ['@tabler/icons-vue', '@vue/devtools-core', '@vue/devtools-kit', 'gravatar-url'],
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
