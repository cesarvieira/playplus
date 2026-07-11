import { describe, expect, it } from 'vitest';

import { toSlug } from '../slug.ts';

describe('toSlug', () => {
  it('converte para minúsculo e troca espaços por hífen', () => {
    expect(toSlug('Ação e Aventura')).toBe('acao-e-aventura');
  });

  it('remove caracteres especiais (strict)', () => {
    expect(toSlug('Sci-Fi & Fantasy!')).toBe('sci-fi-and-fantasy');
  });

  it('retorna string vazia para entrada sem caracteres slugáveis', () => {
    expect(toSlug('   ')).toBe('');
  });
});
