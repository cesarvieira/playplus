import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { signDelegationJwt } from '../delegation-jwt';

const SECRET = 'delegation-test-secret';

describe('delegation-jwt', () => {
  it('assina JWT HS256 com claim sub', () => {
    const token = signDelegationJwt('user-123', SECRET, 60);
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });

    expect(payload).toMatchObject({ sub: 'user-123' });
  });
});
