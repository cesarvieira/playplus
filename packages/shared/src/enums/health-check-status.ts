export const HEALTH_CHECK_STATUS = {
  OK: 'ok',
  ERROR: 'error',
} as const;

export type HealthCheckStatus = (typeof HEALTH_CHECK_STATUS)[keyof typeof HEALTH_CHECK_STATUS];
