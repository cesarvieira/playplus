import jwt from 'jsonwebtoken';

interface DelegationPayload {
  sub: string;
  iat: number;
  exp: number;
}

interface DelegationJwtServiceOptions {
  secret: string;
  ttlSeconds: number;
}

const CLOCK_TOLERANCE_SECONDS = 30;

export class DelegationJwtService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(options: DelegationJwtServiceOptions) {
    this.secret = options.secret;
    this.ttlSeconds = options.ttlSeconds;
  }

  sign(userId: string): string {
    return jwt.sign({ sub: userId }, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.ttlSeconds,
    });
  }

  verify(token: string): DelegationPayload {
    const payload = jwt.verify(token, this.secret, {
      algorithms: ['HS256'],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });

    if (typeof payload === 'string') {
      throw new jwt.JsonWebTokenError('Payload inválido');
    }

    const { sub, iat, exp } = payload;

    if (typeof sub !== 'string') {
      throw new jwt.JsonWebTokenError('Claim sub ausente');
    }

    if (typeof iat !== 'number' || typeof exp !== 'number') {
      throw new jwt.JsonWebTokenError('Claims de tempo inválidas');
    }

    return { sub, iat, exp };
  }
}
