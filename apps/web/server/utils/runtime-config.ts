import { resolveWebSiteUrl } from '../../dev-tls';

export interface ServerRuntimeConfig {
  m2mServiceToken: string;
  delegationJwtSecret: string;
  jwtSecret: string;
  delegationJwtTtlSeconds: number;
  public: {
    apiUrl: string;
    siteUrl: string;
  };
}

export function getServerRuntimeConfig(): ServerRuntimeConfig {
  const publicApiUrl = process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

  return {
    m2mServiceToken: process.env.M2M_SERVICE_TOKEN ?? '',
    delegationJwtSecret: process.env.DELEGATION_JWT_SECRET ?? '',
    jwtSecret: process.env.JWT_SECRET ?? '',
    delegationJwtTtlSeconds: Number(process.env.DELEGATION_JWT_TTL_SECONDS ?? 60),
    public: {
      apiUrl: publicApiUrl,
      siteUrl: resolveWebSiteUrl(),
    },
  };
}
