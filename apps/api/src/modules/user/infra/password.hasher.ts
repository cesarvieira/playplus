import { verify } from '@node-rs/argon2';

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return verify(passwordHash, plain);
}
