import { z } from 'zod';

const booleanFromEnv = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('postgresql://'), {
      message: 'Must start with postgresql://',
    }),
  VALKEY_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('redis://'), {
      message: 'Must start with redis://',
    }),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive(),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive(),
  ADMIN_SEED_EMAIL: z.string().email(),
  ADMIN_SEED_PASSWORD: z.string().min(1),
  API_PORT: z.coerce.number().int().min(1).max(65535),
  API_HOST: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  COOKIE_SECURE: booleanFromEnv,
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']),
});

type Env = z.infer<typeof envSchema>;

function formatEnvErrors(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const field = issue.path.join('.') || 'unknown';
    return `  ${field}: ${issue.message}`;
  });

  return ['Variáveis de ambiente inválidas ou ausentes:', ...lines].join('\n');
}

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (result.success) {
    return result.data;
  }

  process.stderr.write(`${formatEnvErrors(result.error)}\n`);
  process.exit(1);
}

export const env = parseEnv();
