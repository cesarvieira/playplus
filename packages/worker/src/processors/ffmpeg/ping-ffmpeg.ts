import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PING_TIMEOUT_MS = 5_000;

export async function pingFfmpeg(ffmpegPath = 'ffmpeg'): Promise<void> {
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-version'], {
      timeout: PING_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });

    if (!stdout.includes('ffmpeg version')) {
      throw new Error(`Resposta inesperada do FFmpeg em ${ffmpegPath}`);
    }
  } catch (error: unknown) {
    const hint =
      'Instale via scoop install ffmpeg (Windows) ou defina FFMPEG_PATH no .env.';

    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`FFmpeg não encontrado em "${ffmpegPath}". ${hint}`);
    }

    if (error instanceof Error) {
      throw new Error(`FFmpeg indisponível em "${ffmpegPath}": ${error.message}. ${hint}`);
    }

    throw new Error(`FFmpeg indisponível em "${ffmpegPath}". ${hint}`);
  }
}
