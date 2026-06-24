const testEnvDefaults: Record<string, string> = {
  DATABASE_URL: 'postgresql://playplus:playplus@localhost:5432/playplus',
  VALKEY_URL: 'redis://localhost:6379',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_BUCKET: 'playplus',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin',
  STORAGE_REGION: 'us-east-1',
  NODE_ENV: 'test',
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  process.env[key] ??= value;
}
