import { hash, verify } from '@node-rs/argon2';

/**
 * Parâmetros de custo do Argon2id usados em todo o projeto. Ponto único de
 * verdade — qualquer geração de hash de senha deve passar por `hashPassword`.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return verify(passwordHash, plain);
}
