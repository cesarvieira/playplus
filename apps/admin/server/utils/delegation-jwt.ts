import jwt from 'jsonwebtoken';

export function signDelegationJwt(userId: string, secret: string, ttlSeconds: number): string {
  return jwt.sign({ sub: userId }, secret, {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
  });
}
