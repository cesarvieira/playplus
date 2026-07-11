import gravatarUrl from 'gravatar-url';

/**
 * Retorna a URL do avatar de um usuário a partir do e-mail.
 *
 * O contrato é provider-neutro (apenas "uma URL de avatar"). Gravatar é o
 * provedor atual e fica encapsulado aqui — trocar de provedor (ou passar a
 * self-hospedar) se resume a alterar este módulo, sem tocar nos callers.
 */
export function getAvatarUrl(email: string, size = 68): string {
  const normalized = email.trim();

  if (normalized.length === 0) {
    return `https://gravatar.com/avatar/?size=${size}&default=mp`;
  }

  return gravatarUrl(normalized, { size, default: 'mp' });
}
