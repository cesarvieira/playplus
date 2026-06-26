import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withApiContext } from '~/test-utils/auth.harness';
import { useVideoDetail } from '~/composables/useVideoDetail';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('~/utils/api-client', () => ({
  apiFetch: apiFetchMock,
}));

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('useVideoDetail', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('fetches video details on mount', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'vid-1',
      title: 'Test Video',
      status: 'ready',
      duration: 120,
      thumbnail_url: null,
      created_at: '2025-01-01T00:00:00Z',
    });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { video, status } = useVideoDetail('vid-1');
      await flushPromises();

      expect(apiFetchMock).toHaveBeenCalledWith('/videos/vid-1', expect.anything());
      expect(status.value).toBe('ready');
      expect(video.value?.title).toBe('Test Video');
    });
  });

  it('maps queued status to unavailable_queued', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'vid-1',
      title: 'Test Video',
      status: 'queued',
      duration: null,
      thumbnail_url: null,
      created_at: '2025-01-01T00:00:00Z',
    });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { status } = useVideoDetail('vid-1');
      await flushPromises();

      expect(status.value).toBe('unavailable_queued');
    });
  });

  it('maps processing/pending status to unavailable_processing', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'vid-1',
      title: 'Test Video',
      status: 'processing',
      duration: null,
      thumbnail_url: null,
      created_at: '2025-01-01T00:00:00Z',
    });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { status } = useVideoDetail('vid-1');
      await flushPromises();

      expect(status.value).toBe('unavailable_processing');
    });
  });

  it('maps error status to unavailable_error', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'vid-1',
      title: 'Test Video',
      status: 'error',
      duration: null,
      thumbnail_url: null,
      created_at: '2025-01-01T00:00:00Z',
    });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { status } = useVideoDetail('vid-1');
      await flushPromises();

      expect(status.value).toBe('unavailable_error');
    });
  });

  it('maps 409 error to unavailable_processing', async () => {
    apiFetchMock.mockRejectedValueOnce({ statusCode: 409 });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { status } = useVideoDetail('vid-1');
      await flushPromises();

      expect(status.value).toBe('unavailable_processing');
    });
  });

  it('maps 404 error to not_found', async () => {
    apiFetchMock.mockRejectedValueOnce({ statusCode: 404 });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { status } = useVideoDetail('vid-1');
      await flushPromises();

      expect(status.value).toBe('not_found');
    });
  });

  it('maps other errors to error_api', async () => {
    apiFetchMock.mockRejectedValueOnce({
      statusCode: 500,
      data: { error: { code: 'INTERNAL_ERROR', message: 'Database failed' } },
    });

    await withApiContext(async ({ store }) => {
      store.accessToken = 'access-token';
      const { status, errorMessage } = useVideoDetail('vid-1');
      await flushPromises();

      expect(status.value).toBe('error_api');
      expect(errorMessage.value).toBe('Database failed');
    });
  });
});
