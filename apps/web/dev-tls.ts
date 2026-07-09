/**
 * URL pública do viewer (apps/web) — usada como siteUrl neste app.
 *
 * Em dev o TLS e o hostname público são providos pelo Caddy; defina
 * `NUXT_PUBLIC_WEB_URL=https://web.playplus.localhost`. Sem a variável (modo
 * HTTP rápido, sem proxy) cai no default localhost.
 */
export function resolveWebSiteUrl(): string {
  return process.env.NUXT_PUBLIC_WEB_URL || 'http://localhost:3001';
}
