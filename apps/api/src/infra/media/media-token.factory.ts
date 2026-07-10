import { env } from '#config/env';

import { MediaTokenSigner } from './media-token.ts';

export function createMediaTokenSigner(): MediaTokenSigner {
  return new MediaTokenSigner(env.MEDIA_TOKEN_SECRET, env.MEDIA_TOKEN_TTL_SECONDS);
}
