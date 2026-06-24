import { parseWorkerEnv, type WorkerEnv } from './env.schema.ts';

type LoadedWorkerEnv = WorkerEnv & {
  FFMPEG_PATH: string;
};

function loadEnv(): LoadedWorkerEnv {
  try {
    const parsed = parseWorkerEnv(process.env);
    return {
      ...parsed,
      FFMPEG_PATH: parsed.FFMPEG_PATH ?? 'ffmpeg',
    };
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

export const env = loadEnv();
