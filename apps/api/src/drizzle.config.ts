import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './infra/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
