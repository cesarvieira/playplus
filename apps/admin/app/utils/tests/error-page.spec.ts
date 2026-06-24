import type { NuxtError } from '#app';
import { describe, expect, it } from 'vitest';

import {
  ERROR_PAGE_CONTENT,
  buildErrorDevDetails,
  formatErrorDevDetails,
  isOfflineError,
  parseStackLines,
  resolveErrorPageVariant,
} from '../error-page';

describe('resolveErrorPageVariant', () => {
  it('maps 404 status codes', () => {
    expect(resolveErrorPageVariant({ statusCode: 404, message: 'Not Found' })).toBe('404');
  });

  it('maps network failures to offline', () => {
    expect(resolveErrorPageVariant({ statusCode: 0, message: 'Failed to fetch' })).toBe('offline');
    expect(
      resolveErrorPageVariant({
        statusCode: 500,
        message: 'NetworkError when attempting to fetch resource.',
      }),
    ).toBe('offline');
  });

  it('defaults to server error', () => {
    expect(resolveErrorPageVariant({ statusCode: 500, message: 'Internal Server Error' })).toBe(
      '500',
    );
  });
});

describe('isOfflineError', () => {
  it('detects fetch timeouts', () => {
    expect(isOfflineError({ statusCode: 503, message: 'connection timed out' })).toBe(true);
  });
});

describe('parseStackLines', () => {
  it('returns trimmed stack lines', () => {
    const stack =
      'Error: boom\n    at foo (file.ts:1:1)\n    at bar (file.ts:2:2)\n    at baz (file.ts:3:3)';

    expect(parseStackLines(stack, 2)).toEqual(['foo (file.ts:1:1)', 'bar (file.ts:2:2)']);
  });
});

describe('buildErrorDevDetails', () => {
  it('extracts error metadata', () => {
    const details = buildErrorDevDetails(
      {
        statusCode: 500,
        message: 'transcode worker did not respond',
        name: 'InternalServerError',
        stack: 'Error: worker timeout\n    at Worker.run (worker.js:88:23)',
      } as NuxtError,
      '/videos/demo',
    );

    expect(details.name).toBe('InternalServerError');
    expect(details.message).toBe('transcode worker did not respond');
    expect(details.statusCode).toBe(500);
    expect(details.route).toBe('/videos/demo');
    expect(details.stackLines[0]).toBe('Worker.run (worker.js:88:23)');
  });
});

describe('formatErrorDevDetails', () => {
  it('formats copy-friendly output', () => {
    const text = formatErrorDevDetails({
      name: 'NotFoundError',
      message: 'no route matched for \'/videos/missing\'',
      stackLines: ['route (pages/[id].vue:12:3)'],
      statusCode: 404,
      route: '/videos/missing',
      timestamp: '2026-06-22T14:07:33.281Z',
    });

    expect(text).toContain('NotFoundError: no route matched');
    expect(text).toContain('statusCode: 404');
    expect(text).toContain('route: /videos/missing');
  });
});

describe('ERROR_PAGE_CONTENT', () => {
  it('defines copy for all variants', () => {
    expect(ERROR_PAGE_CONTENT['404'].headline).toBe('Essa cena não existe.');
    expect(ERROR_PAGE_CONTENT.offline.code).toBe('⚡');
  });
});
