import { describe, expect, it } from 'vitest';

import { formatDate } from '../format';
import {
  assertScheduleDateIsFuture,
  datetimeLocalToIso,
  getPublicationBadgeLabel,
  getPublicationMenuActions,
  resolvePublicationStatus,
  toDatetimeLocalValue,
} from '../video-publication';

const NOW = new Date('2026-07-07T15:00:00.000Z');

describe('resolvePublicationStatus', () => {
  it('retorna draft quando published_at é null', () => {
    expect(resolvePublicationStatus(null, NOW)).toBe('draft');
  });

  it('retorna scheduled quando published_at é futuro', () => {
    expect(resolvePublicationStatus('2030-01-01T00:00:00.000Z', NOW)).toBe('scheduled');
  });

  it('retorna published quando published_at é passado ou presente', () => {
    expect(resolvePublicationStatus('2026-01-01T00:00:00.000Z', NOW)).toBe('published');
    expect(resolvePublicationStatus('2026-07-07T15:00:00.000Z', NOW)).toBe('published');
  });
});

describe('getPublicationBadgeLabel', () => {
  it('retorna rótulos por status', () => {
    expect(getPublicationBadgeLabel('draft')).toBe('Rascunho');
    expect(getPublicationBadgeLabel('published')).toBe('Publicado');
  });

  it('inclui data formatada para agendado', () => {
    const publishedAt = '2030-06-15T12:00:00.000Z';
    const label = getPublicationBadgeLabel('scheduled', publishedAt);

    expect(label).toBe(
      formatDate(publishedAt, 'pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  });
});

describe('assertScheduleDateIsFuture', () => {
  it('aceita data futura', () => {
    expect(assertScheduleDateIsFuture('2030-01-01T00:00:00.000Z', NOW)).toBeNull();
  });

  it('rejeita data passada ou presente', () => {
    expect(assertScheduleDateIsFuture('2020-01-01T00:00:00.000Z', NOW)).toBe(
      'Escolha uma data e hora no futuro.',
    );
    expect(assertScheduleDateIsFuture('2026-07-07T15:00:00.000Z', NOW)).toBe(
      'Escolha uma data e hora no futuro.',
    );
  });

  it('rejeita valor inválido', () => {
    expect(assertScheduleDateIsFuture('invalid', NOW)).toBe(
      'Informe uma data e hora válidas.',
    );
  });
});

describe('getPublicationMenuActions', () => {
  it('expõe ações corretas por status', () => {
    expect(getPublicationMenuActions('draft')).toEqual({
      publish: true,
      schedule: true,
      unpublish: false,
    });
    expect(getPublicationMenuActions('published')).toEqual({
      publish: false,
      schedule: true,
      unpublish: true,
    });
    expect(getPublicationMenuActions('scheduled')).toEqual({
      publish: true,
      schedule: true,
      unpublish: true,
    });
  });
});

describe('datetime helpers', () => {
  it('converte Date para valor datetime-local', () => {
    const date = new Date('2026-12-25T14:30:00');
    expect(toDatetimeLocalValue(date)).toBe('2026-12-25T14:30');
  });

  it('converte datetime-local para ISO', () => {
    const iso = datetimeLocalToIso('2030-01-01T10:00');
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});
