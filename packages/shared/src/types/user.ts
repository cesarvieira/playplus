import type { UserRole } from '../enums/user-role.js';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
