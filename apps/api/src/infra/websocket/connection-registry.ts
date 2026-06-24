import type { UserRole } from '@playplus/shared';
import type { WebSocket } from 'ws';

import { canAccess } from '#modules/user/domain/can-access';

interface RegisteredConnection {
  userId: string;
  role: UserRole;
  socket: WebSocket;
}

export class ConnectionRegistry {
  private readonly connections = new Map<WebSocket, RegisteredConnection>();

  add(userId: string, role: UserRole, socket: WebSocket): void {
    this.connections.set(socket, { userId, role, socket });
  }

  remove(socket: WebSocket): void {
    this.connections.delete(socket);
  }

  broadcastToAdmins(message: string): void {
    for (const { role, socket } of this.connections.values()) {
      if (!canAccess('admin', role)) {
        continue;
      }

      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  closeAll(): void {
    for (const { socket } of this.connections.values()) {
      if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
        socket.close();
      }
    }

    this.connections.clear();
  }

  get size(): number {
    return this.connections.size;
  }
}
