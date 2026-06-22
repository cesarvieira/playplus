export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxtjs/google-fonts'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/ws',
      webUrl: process.env.NUXT_PUBLIC_WEB_URL ?? 'http://localhost:3001',
    },
  },
  srcDir: 'app',
  devServer: {
    port: 3001,
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
    typeCheck: true,
    // customize tsconfig.app.json
    tsConfig: {
      extends: '../../../tsconfig.base.json',
    },
    // customize tsconfig.shared.json
    sharedTsConfig: {
      extends: '../../../tsconfig.base.json',
    },
    // customize tsconfig.node.json
    nodeTsConfig: {
      extends: '../../../tsconfig.base.json',
    },
  },
  eslint: {
    checker: true,
    config: {
      standalone: false,
    },
  },
  googleFonts: {
    families: {
      'Plus Jakarta Sans': [400, 500, 600, 700, 800],
    },
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },
});
