import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWebSiteUrl } from './dev-tls';

const webRoot = dirname(fileURLToPath(import.meta.url));
const sharedEntry = resolve(webRoot, '../../packages/shared/src/index.ts');
const publicApiUrl = process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    ...(process.env.VITEST ? ['@nuxt/test-utils/module'] as const : []),
  ],
  app: {
    head: {
      title: 'Play+',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#14100D' },
      ],
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
      /** URL canônica deste app (viewer). Override: NUXT_PUBLIC_WEB_URL. */
      siteUrl: resolveWebSiteUrl(),
    },
  },
  srcDir: 'app',
  alias: {
    '@playplus/shared': sharedEntry,
  },
  devServer: {
    // Bind apenas em loopback: o dev server nunca é exposto na LAN. O TLS e o
    // hostname público (web.playplus.localhost) são providos pelo Caddy, que
    // alcança este processo via host.docker.internal:3001.
    host: process.env.NUXT_DEV_HOST || '127.0.0.1',
    port: 3001,
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
      // HMR: o browser conecta wss na 443 (mesmo host público) e o Caddy
      // encaminha o upgrade para a porta deste dev server.
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@tabler/icons-vue',
        'gravatar-url',
        'hls.js',
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
