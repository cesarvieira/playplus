import type { H3Event } from 'h3';
import { describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { ensureServerSession } from '../server-session.server';

const ensureMock = vi.hoisted(() => vi.fn());

vi.mock('~~/server/utils/session-refresh', () => ({
  ensureServerSession: ensureMock,
}));

const event = { context: {} } as unknown as H3Event;

describe('ensureServerSession wrapper', () => {
  it('delega para util Nitro de refresh', async () => {
    const session = { userId: 'user-1', role: USER_ROLE.VIEWER, exp: 999 };
    ensureMock.mockResolvedValue(session);

    await expect(ensureServerSession(event)).resolves.toEqual(session);
    expect(ensureMock).toHaveBeenCalledWith(event);
  });
});
