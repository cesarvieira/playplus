import { describe, expect, it } from 'vitest';
import { formatBytes, formatDate, formatPercent } from '../format';

describe('formatDate', () => {
  it('formats a fixed date in pt-BR', () => {
    const result = formatDate(new Date('2026-06-22T15:30:00.000Z'), 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });

    expect(result).toBe('22/06/2026');
  });
});

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024 * 1.84)).toBe('1.8 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });
});

describe('formatPercent', () => {
  it('formats whole percent', () => {
    expect(formatPercent(47)).toBe('47%');
  });

  it('clamps values above 100', () => {
    expect(formatPercent(150)).toBe('100%');
  });

  it('clamps negative values to zero', () => {
    expect(formatPercent(-5)).toBe('0%');
  });
});
