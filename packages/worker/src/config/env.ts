import { parseWorkerEnv, type WorkerEnv } from './env.schema.ts';

function loadEnv(): WorkerEnv {
  try {
    return parseWorkerEnv(process.env);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

export const env = loadEnv();
