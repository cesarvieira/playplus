const testEnvDefaults: Record<string, string> = {
  DATABASE_URL: 'postgresql://playplus:playplus@localhost:5432/playplus',
  VALKEY_URL: 'redis://localhost:6379',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_BUCKET: 'playplus',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin',
  STORAGE_REGION: 'us-east-1',
  JWT_SECRET: 'test-jwt-secret-with-at-least-32-characters',
  JWT_ACCESS_TTL_SECONDS: '900',
  JWT_REFRESH_TTL_SECONDS: '604800',
  ADMIN_SEED_EMAIL: 'admin@playplus.localhost',
  ADMIN_SEED_PASSWORD: 'test-password',
  API_PORT: '3000',
  API_HOST: '127.0.0.1',
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  M2M_SERVICE_TOKEN: 'test-m2m-service-token-at-least-32-chars',
  DELEGATION_JWT_SECRET: 'test-delegation-secret-at-least-32-chars',
  DELEGATION_JWT_TTL_SECONDS: '60',
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  process.env[key] ??= value;
}
