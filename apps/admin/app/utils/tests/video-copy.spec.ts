import { VIDEO_STATUS } from '@playplus/shared';
import { describe, expect, it } from 'vitest';

import {
  getRowPrimaryAction,
  getRowSecondaryText,
  getStatusBadgeLabel,
  resolveVideoErrorReason,
  VIDEO_ERROR_ROW_COPY,
} from '../video-copy';

describe('video-copy', () => {
  it('retorna labels de badge por status', () => {
    expect(getStatusBadgeLabel(VIDEO_STATUS.READY)).toBe('Pronto');
    expect(getStatusBadgeLabel(VIDEO_STATUS.QUEUED)).toBe('Na fila');
  });

  it('retorna copy secundária para pending com upload completo', () => {
    expect(getRowSecondaryText(VIDEO_STATUS.PENDING, false)).toBe('Aguardando upload…');
    expect(getRowSecondaryText(VIDEO_STATUS.PENDING, true)).toBe('Pronto para transcodificar');
  });

  it('retorna ações primárias esperadas', () => {
    expect(getRowPrimaryAction(VIDEO_STATUS.READY)).toBe('watch');
    expect(getRowPrimaryAction(VIDEO_STATUS.PENDING, true)).toBe('transcode');
    expect(getRowPrimaryAction(VIDEO_STATUS.ERROR)).toBe('retry');
    expect(getRowPrimaryAction(VIDEO_STATUS.QUEUED)).toBeNull();
  });

  it('expõe copy de erro da linha', () => {
    expect(getRowSecondaryText(VIDEO_STATUS.ERROR)).toBe(VIDEO_ERROR_ROW_COPY);
  });

  it('humaniza reason de FFmpeg', () => {
    expect(resolveVideoErrorReason('ffmpeg_exit_code_1')).toBe(
      'O FFmpeg encerrou com erro durante a transcodificação.',
    );
  });

  it('usa fallback para reason desconhecido em formato de código', () => {
    expect(resolveVideoErrorReason('unknown_machine_code')).toBe(VIDEO_ERROR_ROW_COPY);
  });

  it('preserva mensagens legíveis do worker', () => {
    expect(resolveVideoErrorReason('Arquivo de entrada corrompido.')).toBe(
      'Arquivo de entrada corrompido.',
    );
  });

  it('retorna fallback quando reason está ausente', () => {
    expect(resolveVideoErrorReason()).toBe(VIDEO_ERROR_ROW_COPY);
  });
});
