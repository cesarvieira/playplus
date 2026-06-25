import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpload } from '../useUpload';
import { PRESIGNED_EXPIRED_MESSAGE } from '../../utils/upload';
import {
  UploadAbortedError,
  UploadHttpError,
} from '../../utils/upload-xhr';

const mockApi = vi.fn();
const mockPutFileWithProgress = vi.fn();

vi.mock('~/composables/useApi', () => ({
  useApi: () => ({ api: mockApi }),
}));

vi.mock('~/utils/upload-xhr', async (importOriginal) => {
  const original = await importOriginal<typeof import('~/utils/upload-xhr')>();

  return {
    ...original,
    putFileWithProgress: (...args: Parameters<typeof original.putFileWithProgress>) =>
      mockPutFileWithProgress(...args),
  };
});

function createFile(name = 'video.mp4', size = 1024): File {
  const file = new File([new Uint8Array(1)], name, { type: 'video/mp4' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function mockSuccessfulUpload() {
  mockPutFileWithProgress.mockReturnValue({
    promise: Promise.resolve(),
    abort: vi.fn(),
  });
}

function mockRegisterVideo() {
  mockApi.mockResolvedValueOnce({
    id: 'video-1',
    upload_url: 'https://storage.example/upload',
    status: 'pending',
  });
}

function mockTranscodeEnqueue() {
  mockApi.mockResolvedValueOnce({
    job_id: 'transcode:video-1',
    status: 'queued',
  });
}

vi.mock('#app', () => ({
  refreshNuxtData: vi.fn().mockResolvedValue(undefined),
}));

function deferredUploadPromise(rejectWith: Error) {
  return new Promise<void>((_resolve, reject) => {
    queueMicrotask(() => reject(rejectWith));
  });
}

describe('useUpload', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockPutFileWithProgress.mockReset();
  });

  it('transitions idle → registering → uploading → enqueueing_transcode → success', async () => {
    mockRegisterVideo();
    mockTranscodeEnqueue();
    mockSuccessfulUpload();

    const upload = useUpload();

    await upload.start({ title: 'Meu vídeo', file: createFile() });

    expect(mockApi).toHaveBeenCalledWith('/videos', {
      method: 'POST',
      body: {
        title: 'Meu vídeo',
        file_name: 'video.mp4',
        file_size: 1024,
      },
    });
    expect(mockPutFileWithProgress).toHaveBeenCalled();
    expect(mockApi).toHaveBeenCalledWith('/videos/video-1/transcode', { method: 'POST' });
    expect(upload.state.phase).toBe('success');
    expect(upload.state.videoId).toBe('video-1');
  });

  it('sets presigned_expired error on HTTP 403 during upload', async () => {
    mockApi.mockResolvedValueOnce({
      id: 'video-1',
      upload_url: 'https://storage.example/upload',
      status: 'pending',
    });
    mockPutFileWithProgress.mockReturnValue({
      promise: deferredUploadPromise(new UploadHttpError(403)),
      abort: vi.fn(),
    });

    const upload = useUpload();
    await upload.start({ title: 'Meu vídeo', file: createFile() });

    expect(upload.state.phase).toBe('error');
    expect(upload.state.errorKind).toBe('presigned_expired');
    expect(upload.state.errorMessage).toBe(PRESIGNED_EXPIRED_MESSAGE);
  });

  it('retries with same URL on network error', async () => {
    mockRegisterVideo();
    mockPutFileWithProgress
      .mockReturnValueOnce({
        promise: deferredUploadPromise(new UploadHttpError(0)),
        abort: vi.fn(),
      })
      .mockReturnValueOnce({
        promise: Promise.resolve(),
        abort: vi.fn(),
      });
    mockTranscodeEnqueue();

    const upload = useUpload();
    await upload.start({ title: 'Meu vídeo', file: createFile() });
    expect(upload.state.errorKind).toBe('network');

    await upload.retry();

    expect(mockApi).toHaveBeenCalledTimes(2);
    expect(mockPutFileWithProgress).toHaveBeenCalledTimes(2);
    expect(mockPutFileWithProgress.mock.calls[1]?.[0]?.url).toBe('https://storage.example/upload');
    expect(upload.state.phase).toBe('success');
  });

  it('renews upload URL on presigned_expired retry', async () => {
    mockApi
      .mockResolvedValueOnce({
        id: 'video-1',
        upload_url: 'https://storage.example/expired',
        status: 'pending',
      })
      .mockResolvedValueOnce({
        id: 'video-1',
        upload_url: 'https://storage.example/renewed',
        status: 'pending',
      });
    mockPutFileWithProgress
      .mockReturnValueOnce({
        promise: deferredUploadPromise(new UploadHttpError(403)),
        abort: vi.fn(),
      })
      .mockReturnValueOnce({
        promise: Promise.resolve(),
        abort: vi.fn(),
      });
    mockTranscodeEnqueue();

    const upload = useUpload();
    await upload.start({ title: 'Meu vídeo', file: createFile() });
    await upload.retry();

    expect(mockApi).toHaveBeenCalledWith('/videos/video-1/upload-url', { method: 'POST' });
    expect(mockPutFileWithProgress.mock.calls[1]?.[0]?.url).toBe('https://storage.example/renewed');
    expect(upload.state.phase).toBe('success');
  });

  it('cancel aborts active upload and returns to idle', async () => {
    mockApi.mockResolvedValueOnce({
      id: 'video-1',
      upload_url: 'https://storage.example/upload',
      status: 'pending',
    });

    const abort = vi.fn();
    let rejectUpload: ((error: Error) => void) | undefined;
    mockPutFileWithProgress.mockReturnValue({
      promise: new Promise((_resolve, reject) => {
        rejectUpload = reject;
      }),
      abort: () => {
        abort();
        rejectUpload?.(new UploadAbortedError());
      },
    });

    const upload = useUpload();
    const startPromise = upload.start({ title: 'Meu vídeo', file: createFile() });

    await vi.waitFor(() => {
      expect(upload.state.phase).toBe('uploading');
    });

    upload.cancel();

    await startPromise;

    expect(abort).toHaveBeenCalled();
    expect(upload.state.phase).toBe('idle');
    expect(upload.state.errorKind).toBe('aborted');
  });

  it('rejects invalid file before calling API', async () => {
    const upload = useUpload();
    const emptyFile = new File([], 'empty.mp4', { type: 'video/mp4' });

    await upload.start({ title: 'Meu vídeo', file: emptyFile });

    expect(mockApi).not.toHaveBeenCalled();
    expect(upload.state.phase).toBe('error');
    expect(upload.state.errorKind).toBe('register');
  });
});
