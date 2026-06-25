import { formatBytes } from './format';

export const MAX_UPLOAD_BYTES = 2 * 1024 ** 3;

export const PRESIGNED_EXPIRED_MESSAGE =
  'A URL de upload expirou antes de concluir. Nenhum dado foi perdido — tente de novo.';

export const UPLOAD_NETWORK_ERROR_MESSAGE =
  'Falha na conexão durante o envio. Verifique sua internet e tente novamente.';

export type UploadValidationResult =
  { ok: true } |
  { ok: false; message: string };

export function validateUploadFile(file: File | null | undefined): UploadValidationResult {
  if (!file) {
    return { ok: false, message: 'Selecione um arquivo de vídeo.' };
  }

  if (file.size <= 0) {
    return { ok: false, message: 'O arquivo está vazio.' };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `O arquivo excede o limite de ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }

  return { ok: true };
}

export function isPresignedUrlExpired(status: number): boolean {
  return status === 403;
}

export function buildUploadProgressLabel(progress: number): string {
  return `Enviando… ${Math.round(Math.min(100, Math.max(0, progress)))}%`;
}

export function buildEnqueueTranscodeProgressLabel(): string {
  return 'Enfileirando transcodificação…';
}

export function buildUploadProgressValueText(
  progress: number,
  bytesLoaded: number,
  totalBytes: number,
): string {
  const percent = Math.round(Math.min(100, Math.max(0, progress)));
  return `Enviando, ${percent} por cento, ${formatBytes(bytesLoaded)} de ${formatBytes(totalBytes)}`;
}

export function buildEnqueueTranscodeProgressValueText(totalBytes: number): string {
  return `Enfileirando transcodificação, envio concluído, ${formatBytes(totalBytes)} enviados`;
}
