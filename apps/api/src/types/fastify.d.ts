import '@fastify/cookie';
import type { UserRole } from '@playplus/shared';

declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
    user: {
      id: string;
      role: UserRole;
    };
  }
}
