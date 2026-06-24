import { describe, expect, it } from 'vitest';

import { selectRenditions } from '../renditions.ts';

describe('selectRenditions', () => {
  it('omite rendições acima da altura da source (360p)', () => {
    expect(selectRenditions(360).map(r => r.name)).toEqual(['240p']);
  });

  it('inclui 240p e 480p para source 720p', () => {
    expect(selectRenditions(720).map(r => r.name)).toEqual(['240p', '480p', '720p']);
  });

  it('inclui todas as rendições para source 1080p ou superior', () => {
    expect(selectRenditions(1080).map(r => r.name)).toEqual(['240p', '480p', '720p', '1080p']);
    expect(selectRenditions(2160).map(r => r.name)).toEqual(['240p', '480p', '720p', '1080p']);
  });
});
