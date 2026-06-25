export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export interface PutFileWithProgressOptions {
  url: string;
  file: File;
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: { aborted: boolean };
}

export class UploadAbortedError extends Error {
  readonly aborted = true;

  constructor() {
    super('Upload aborted');
    this.name = 'UploadAbortedError';
  }
}

export class UploadHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Upload failed with status ${status}`);
    this.name = 'UploadHttpError';
    this.status = status;
  }
}

export interface XhrUploadHandle {
  promise: Promise<void>;
  abort: () => void;
}

export function putFileWithProgress(options: PutFileWithProgressOptions): XhrUploadHandle {
  const { url, file, onProgress, signal } = options;
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percent = event.total > 0 ? (event.loaded / event.total) * 100 : 0;
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    });

    xhr.addEventListener('load', () => {
      if (signal?.aborted) {
        reject(new UploadAbortedError());
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new UploadHttpError(xhr.status));
    });

    xhr.addEventListener('error', () => {
      if (signal?.aborted) {
        reject(new UploadAbortedError());
        return;
      }

      reject(new UploadHttpError(0));
    });

    xhr.addEventListener('abort', () => {
      reject(new UploadAbortedError());
    });

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
}
