import { describe, expect, it, vi } from 'vitest';
import { USER_ROLE, VIDEO_STATUS } from '@playplus/shared';
import type { WebSocket } from 'ws';

import { ConnectionRegistry } from '../connection-registry.ts';

function createMockSocket(readyState = 1): WebSocket & { sent: string[] } {
  const sent: string[] = [];

  return {
    OPEN: 1,
    CONNECTING: 0,
    readyState,
    sent,
    send: vi.fn((message: string) => {
      sent.push(message);
    }),
    close: vi.fn(),
  } as unknown as WebSocket & { sent: string[] };
}

describe('ConnectionRegistry', () => {
  it('mantém múltiplas conexões do mesmo userId', () => {
    const registry = new ConnectionRegistry();
    const socketA = createMockSocket();
    const socketB = createMockSocket();

    registry.add('user-1', USER_ROLE.ADMIN, socketA);
    registry.add('user-1', USER_ROLE.ADMIN, socketB);

    expect(registry.size).toBe(2);
  });

  it('broadcastToAdmins envia para todas as conexões admin', () => {
    const registry = new ConnectionRegistry();
    const socketA = createMockSocket();
    const socketB = createMockSocket();

    registry.add('admin-1', USER_ROLE.ADMIN, socketA);
    registry.add('admin-2', USER_ROLE.ADMIN, socketB);

    registry.broadcastToAdmins('{"type":"video.status"}');

    expect(socketA.sent).toEqual(['{"type":"video.status"}']);
    expect(socketB.sent).toEqual(['{"type":"video.status"}']);
  });

  it('broadcastToAdmins não envia para viewer', () => {
    const registry = new ConnectionRegistry();
    const adminSocket = createMockSocket();
    const viewerSocket = createMockSocket();

    registry.add('admin-1', USER_ROLE.ADMIN, adminSocket);
    registry.add('viewer-1', USER_ROLE.VIEWER, viewerSocket);

    const event = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'v1',
        job_id: 'j1',
        status: VIDEO_STATUS.PROCESSING,
      },
    });

    registry.broadcastToAdmins(event);

    expect(adminSocket.sent).toEqual([event]);
    expect(viewerSocket.sent).toEqual([]);
  });

  it('remove conexão ao chamar remove', () => {
    const registry = new ConnectionRegistry();
    const socket = createMockSocket();

    registry.add('admin-1', USER_ROLE.ADMIN, socket);
    registry.remove(socket);
    registry.broadcastToAdmins('event');

    expect(socket.sent).toEqual([]);
    expect(registry.size).toBe(0);
  });

  it('closeAll fecha e limpa conexões', () => {
    const registry = new ConnectionRegistry();
    const socket = createMockSocket();

    registry.add('admin-1', USER_ROLE.ADMIN, socket);
    registry.closeAll();

    expect(socket.close).toHaveBeenCalled();
    expect(registry.size).toBe(0);
  });
});
