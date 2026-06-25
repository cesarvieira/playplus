import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UploadAbortedError,
  UploadHttpError,
  putFileWithProgress,
} from '../upload-xhr';

type XhrListener = (event?: Event) => void;

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  upload = { addEventListener: vi.fn() };
  status = 200;
  private listeners = new Map<string, XhrListener[]>();

  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  abort = vi.fn(() => {
    this.trigger('abort');
  });

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  addEventListener(type: string, listener: XhrListener) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  trigger(type: string, event?: Event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  simulateProgress(loaded: number, total: number) {
    const progressListeners = this.upload.addEventListener.mock.calls
      .filter(([eventName]) => eventName === 'progress')
      .map(([, listener]) => listener as (event: ProgressEvent) => void);

    for (const listener of progressListeners) {
      listener({ lengthComputable: true, loaded, total } as ProgressEvent);
    }
  }
}

afterEach(() => {
  MockXMLHttpRequest.instances = [];
  vi.unstubAllGlobals();
});

describe('putFileWithProgress', () => {
  it('resolves on successful upload and reports progress', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);

    const file = new File([new Uint8Array(100)], 'video.mp4', { type: 'video/mp4' });
    const onProgress = vi.fn();

    const handle = putFileWithProgress({
      url: 'https://storage.example/upload',
      file,
      onProgress,
    });

    const xhr = MockXMLHttpRequest.instances[0]!;
    xhr.simulateProgress(50, 100);
    xhr.trigger('load');

    await expect(handle.promise).resolves.toBeUndefined();
    expect(onProgress).toHaveBeenCalledWith({
      loaded: 50,
      total: 100,
      percent: 50,
    });
    expect(xhr.open).toHaveBeenCalledWith('PUT', 'https://storage.example/upload');
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
  });

  it('rejects with UploadHttpError on non-2xx status', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);

    const file = new File([new Uint8Array(10)], 'video.mp4', { type: 'video/mp4' });
    const handle = putFileWithProgress({
      url: 'https://storage.example/upload',
      file,
    });

    const xhr = MockXMLHttpRequest.instances[0]!;
    xhr.status = 403;
    xhr.trigger('load');

    await expect(handle.promise).rejects.toBeInstanceOf(UploadHttpError);
    await expect(handle.promise).rejects.toMatchObject({ status: 403 });
  });

  it('rejects with UploadAbortedError when aborted', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);

    const file = new File([new Uint8Array(10)], 'video.mp4', { type: 'video/mp4' });
    const handle = putFileWithProgress({
      url: 'https://storage.example/upload',
      file,
    });

    handle.abort();

    await expect(handle.promise).rejects.toBeInstanceOf(UploadAbortedError);
  });

  it('rejects with UploadHttpError on network error', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);

    const file = new File([new Uint8Array(10)], 'video.mp4', { type: 'video/mp4' });
    const handle = putFileWithProgress({
      url: 'https://storage.example/upload',
      file,
    });

    MockXMLHttpRequest.instances[0]!.trigger('error');

    await expect(handle.promise).rejects.toMatchObject({ status: 0 });
  });
});
