export default defineNuxtConfig({
  compatibilityDate: '2026-10-12',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  postcss: { plugins: { tailwindcss: {}, autoprefixer: {} } },
  css: ['~/assets/css/main.css'],
  nitro: { preset: 'cloudflare-module' },
  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      title: 'SMD 아카데미 | 인테리어필름 시공 실무 교육',
      meta: [
        { name: 'description', content: '인테리어필름 시공 실습 중심 교육기관 SMD 아카데미.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.5.0/remixicon.min.css' }
      ]
    }
  },
  runtimeConfig: { public: { turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '', privacyRevision: process.env.NUXT_PUBLIC_PRIVACY_REVISION || '', siteOrigin: process.env.NUXT_PUBLIC_SITE_ORIGIN || '' } },
  routeRules: {
    '/api/inquiries': { headers: { 'cache-control': 'no-store' } },
    '/api/bot/**': { headers: { 'cache-control': 'no-store' } }
  }
});
