import type { UserRole } from '@playplus/shared';

type RequiredRole = 'admin' | 'viewer';

/**
 * ADR-004: `viewer` significa rota autenticada (qualquer role);
 * `admin` exige role admin (admin inclui permissões viewer).
 */
export function canAccess(required: RequiredRole, userRole: UserRole): boolean {
  if (required === 'viewer') {
    return true;
  }

  return userRole === 'admin';
}
