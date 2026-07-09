import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVideoStatusWsUrl } from './app/utils/ws-url';
import { resolveViewerPublicUrl } from './dev-tls';
import { createSecurityHeaders } from './security-headers';

const adminRoot = dirname(fileURLToPath(import.meta.url));
const sharedEntry = resolve(adminRoot, '../../packages/shared/src/index.ts');
const isDev = process.env.NODE_ENV !== 'production';
const securityHeaders = createSecurityHeaders(isDev);
const publicApiUrl = process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const publicWsUrl = resolveVideoStatusWsUrl(
  publicApiUrl,
  process.env.NUXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/v1/ws',
);

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
      apiUrl: publicApiUrl,
      wsUrl: publicWsUrl,
      webUrl: resolveViewerPublicUrl(),
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
    // Bind apenas em loopback: o dev server nunca é exposto na LAN. O TLS e o
    // hostname público (admin.playplus.localhost) são providos pelo Caddy, que
    // alcança este processo via host.docker.internal:3002.
    host: process.env.NUXT_DEV_HOST || '127.0.0.1',
    port: 3002,
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
    server: {
      // HMR trafega pelo Caddy: o browser conecta wss na porta 443 (mesmo host
      // público) e o Caddy encaminha o upgrade para este dev server.
      hmr: {
        protocol: 'wss',
        clientPort: 443,
        port: 24681,
      },
    },
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
