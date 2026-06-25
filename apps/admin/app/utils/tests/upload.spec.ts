import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  buildUploadProgressLabel,
  buildUploadProgressValueText,
  isPresignedUrlExpired,
  validateUploadFile,
} from '../upload';

describe('validateUploadFile', () => {
  it('rejects missing file', () => {
    expect(validateUploadFile(null)).toEqual({
      ok: false,
      message: 'Selecione um arquivo de vídeo.',
    });
  });

  it('rejects empty file', () => {
    const file = new File([], 'empty.mp4', { type: 'video/mp4' });
    expect(validateUploadFile(file)).toEqual({
      ok: false,
      message: 'O arquivo está vazio.',
    });
  });

  it('rejects files above 2 GB', () => {
    const file = new File([new Uint8Array(1)], 'large.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: MAX_UPLOAD_BYTES + 1 });

    const result = validateUploadFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('2.0 GB');
    }
  });

  it('accepts valid file', () => {
    const file = new File([new Uint8Array(1024)], 'video.mp4', { type: 'video/mp4' });
    expect(validateUploadFile(file)).toEqual({ ok: true });
  });
});

describe('isPresignedUrlExpired', () => {
  it('returns true for HTTP 403', () => {
    expect(isPresignedUrlExpired(403)).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isPresignedUrlExpired(400)).toBe(false);
    expect(isPresignedUrlExpired(500)).toBe(false);
    expect(isPresignedUrlExpired(200)).toBe(false);
  });
});

describe('buildUploadProgressLabel', () => {
  it('formats progress label', () => {
    expect(buildUploadProgressLabel(47.4)).toBe('Enviando… 47%');
  });

  it('clamps progress values', () => {
    expect(buildUploadProgressLabel(150)).toBe('Enviando… 100%');
    expect(buildUploadProgressLabel(-5)).toBe('Enviando… 0%');
  });
});

describe('buildUploadProgressValueText', () => {
  it('builds accessible progress text', () => {
    const text = buildUploadProgressValueText(47, 865 * 1024 * 1024, 1024 ** 3);
    expect(text).toContain('47 por cento');
    expect(text).toContain('de');
  });
});
