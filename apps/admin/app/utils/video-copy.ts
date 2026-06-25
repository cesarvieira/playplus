import { VIDEO_STATUS, type VideoStatus } from '@playplus/shared';

export const VIDEO_ERROR_ROW_COPY = 'Falha na transcodificação após 3 tentativas.';

export type VideoRowPrimaryAction = 'watch' | 'transcode' | 'retry' | null;

export function getStatusBadgeLabel(status: VideoStatus): string {
  switch (status) {
    case VIDEO_STATUS.PENDING:
      return 'Pendente';
    case VIDEO_STATUS.QUEUED:
      return 'Na fila';
    case VIDEO_STATUS.PROCESSING:
      return 'Processando';
    case VIDEO_STATUS.READY:
      return 'Pronto';
    case VIDEO_STATUS.ERROR:
      return 'Erro';
    default:
      return status;
  }
}

export function getRowSecondaryText(
  status: VideoStatus,
  uploadComplete?: boolean,
): string | null {
  if (status === VIDEO_STATUS.PENDING) {
    return uploadComplete ? 'Pronto para transcodificar' : 'Aguardando upload…';
  }

  if (status === VIDEO_STATUS.QUEUED) {
    return 'Aguardando worker…';
  }

  if (status === VIDEO_STATUS.PROCESSING) {
    return 'Transcodificando…';
  }

  if (status === VIDEO_STATUS.ERROR) {
    return VIDEO_ERROR_ROW_COPY;
  }

  return null;
}

export function getRowPrimaryAction(
  status: VideoStatus,
  uploadComplete?: boolean,
): VideoRowPrimaryAction {
  if (status === VIDEO_STATUS.READY) {
    return 'watch';
  }

  if (status === VIDEO_STATUS.PENDING && uploadComplete === true) {
    return 'transcode';
  }

  if (status === VIDEO_STATUS.ERROR) {
    return 'retry';
  }

  return null;
}

export function getStatusLiveAnnouncement(status: VideoStatus): string {
  return `Status atualizado para ${getStatusBadgeLabel(status)}`;
}
