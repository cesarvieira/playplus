import slugify from 'slugify';

/**
 * Gera um slug canônico a partir de um texto livre.
 *
 * Encapsula o pacote `slugify` com a configuração padrão do projeto
 * (minúsculo, apenas caracteres seguros para URL). Trocar de biblioteca
 * no futuro se resume a alterar este único ponto.
 */
export function toSlug(text: string): string {
  return slugify(text, { lower: true, strict: true });
}
