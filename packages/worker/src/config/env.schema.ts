import { z } from 'zod';

export const workerEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(value => value.startsWith('postgresql://'), {
      message: 'Must start with postgresql://',
    }),
  VALKEY_URL: z
    .string()
    .min(1)
    .refine(value => value.startsWith('redis://'), {
      message: 'Must start with redis://',
    }),
  STORAGE_ENDPOINT: z.url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

function formatEnvErrors(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const field = issue.path.join('.') || 'unknown';
    return `  ${field}: ${issue.message}`;
  });

  return ['Variáveis de ambiente inválidas ou ausentes:', ...lines].join('\n');
}

export function parseWorkerEnv(source: NodeJS.ProcessEnv): WorkerEnv {
  const result = workerEnvSchema.safeParse(source);

  if (result.success) {
    return result.data;
  }

  throw new Error(formatEnvErrors(result.error));
}
