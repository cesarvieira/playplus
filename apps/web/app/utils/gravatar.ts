import gravatarUrl from 'gravatar-url';

export function getGravatarUrl(email: string, size = 68): string {
  const normalized = email.trim();

  if (normalized.length === 0) {
    return `https://gravatar.com/avatar/?size=${size}&default=mp`;
  }

  return gravatarUrl(normalized, { size, default: 'mp' });
}
