export class FfmpegProcessError extends Error {
  readonly exitCode: number;

  constructor(exitCode: number) {
    super(`ffmpeg_exit_code_${exitCode}`);
    this.name = 'FfmpegProcessError';
    this.exitCode = exitCode;
  }

  get reason(): string {
    return `ffmpeg_exit_code_${this.exitCode}`;
  }
}
