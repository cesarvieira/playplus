import { describe, expect, it } from 'vitest';

import { getGravatarUrl } from '../gravatar';

describe('getGravatarUrl', () => {
  it('builds Gravatar URL from normalized email hash', () => {
    expect(getGravatarUrl('MyEmailAddress@example.com', 68)).toBe(
      'https://gravatar.com/avatar/0bc83cb571cd1c50ba6f3e8a78ef1346?size=68&default=mp',
    );
  });

  it('returns default avatar URL for empty email', () => {
    expect(getGravatarUrl('   ', 34)).toBe('https://gravatar.com/avatar/?size=34&default=mp');
  });
});
