import type { HealthCheckStatus } from '../enums/health-check-status.js';
import type { HealthStatus } from '../enums/health-status.js';

export interface HealthResponseDto {
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: HealthCheckStatus;
    valkey: HealthCheckStatus;
  };
}
