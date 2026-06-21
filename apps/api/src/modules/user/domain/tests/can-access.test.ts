import { describe, expect, it } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { canAccess } from '../can-access.ts';

describe('canAccess', () => {
  it('permite viewer para admin', () => {
    expect(canAccess('viewer', USER_ROLE.ADMIN)).toBe(true);
  });

  it('permite viewer para viewer', () => {
    expect(canAccess('viewer', USER_ROLE.VIEWER)).toBe(true);
  });

  it('nega admin para viewer', () => {
    expect(canAccess('admin', USER_ROLE.VIEWER)).toBe(false);
  });

  it('permite admin para admin', () => {
    expect(canAccess('admin', USER_ROLE.ADMIN)).toBe(true);
  });
});
