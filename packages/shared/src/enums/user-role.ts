export const USER_ROLE = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
