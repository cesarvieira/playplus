import jwt from 'jsonwebtoken';

import type { UserRole } from '@playplus/shared';

interface JwtSignInput {
  sub: string;
  role: UserRole;
}

interface JwtPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

interface JwtServiceOptions {
  secret: string;
  accessTtlSeconds: number;
}

const CLOCK_TOLERANCE_SECONDS = 30;

export class JwtService {
  private readonly secret: string;
  private readonly accessTtlSeconds: number;

  constructor(options: JwtServiceOptions) {
    this.secret = options.secret;
    this.accessTtlSeconds = options.accessTtlSeconds;
  }

  sign(input: JwtSignInput): string {
    return jwt.sign({ sub: input.sub, role: input.role }, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.accessTtlSeconds,
    });
  }

  verify(token: string): JwtPayload {
    const payload = jwt.verify(token, this.secret, {
      algorithms: ['HS256'],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });

    if (typeof payload === 'string') {
      throw new jwt.JsonWebTokenError('Payload inválido');
    }

    const { sub, role, iat, exp } = payload;

    if (typeof sub !== 'string' || typeof role !== 'string') {
      throw new jwt.JsonWebTokenError('Claims obrigatórias ausentes');
    }

    if (typeof iat !== 'number' || typeof exp !== 'number') {
      throw new jwt.JsonWebTokenError('Claims de tempo inválidas');
    }

    return { sub, role: role as UserRole, iat, exp };
  }
}
