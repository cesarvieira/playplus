export function buildStorageOriginalKey(id: string, fileName: string): string {
  return `videos/${id}/original/${fileName}`;
}

export function buildStorageHlsPrefix(id: string): string {
  return `videos/${id}/hls/`;
}
