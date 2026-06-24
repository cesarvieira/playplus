import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { isTlsEnabled, loadTlsFileOptions } from '../tls.ts';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('tls config', () => {
  it('isTlsEnabled exige cert e key', () => {
    expect(isTlsEnabled(undefined, undefined)).toBe(false);
    expect(isTlsEnabled('certs/a.pem', undefined)).toBe(false);
    expect(isTlsEnabled('certs/a.pem', 'certs/a-key.pem')).toBe(true);
  });

  it('loadTlsFileOptions lê arquivos quando existem', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation((path) => {
      if (String(path).endsWith('.pem') && !String(path).includes('key')) {
        return Buffer.from('cert-bytes');
      }

      return Buffer.from('key-bytes');
    });

    const options = loadTlsFileOptions('certs/playplus.pem', 'certs/playplus-key.pem');

    expect(options?.cert.toString()).toBe('cert-bytes');
    expect(options?.key.toString()).toBe('key-bytes');
  });
});
