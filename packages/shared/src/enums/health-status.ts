export const HEALTH_STATUS = {
  OK: 'ok',
  DEGRADED: 'degraded',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];
