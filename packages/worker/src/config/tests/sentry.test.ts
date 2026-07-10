import { describe, expect, it } from 'vitest';

import { initSentry } from '../sentry.ts';

describe('initSentry', () => {
  it('é noop quando SENTRY_DSN está ausente', () => {
    expect(() => initSentry()).not.toThrow();
  });
});
