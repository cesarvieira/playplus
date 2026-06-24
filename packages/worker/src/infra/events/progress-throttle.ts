const DEFAULT_INTERVAL_MS = 5_000;

export function createProgressThrottle(
  emit: (progress: number) => void,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  let lastEmitAt = 0;
  let lastProgress = -1;

  const shouldEmit = (progress: number, force: boolean): boolean => {
    if (force) {
      return true;
    }

    if (progress === lastProgress) {
      return false;
    }

    const now = Date.now();

    if (lastEmitAt === 0 || now - lastEmitAt >= intervalMs) {
      return true;
    }

    return false;
  };

  return {
    report(progress: number, options: { force?: boolean } = {}): void {
      const clamped = Math.min(100, Math.max(0, Math.round(progress)));

      if (!shouldEmit(clamped, options.force === true)) {
        return;
      }

      lastEmitAt = Date.now();
      lastProgress = clamped;
      emit(clamped);
    },
    flush(progress = 100): void {
      const clamped = Math.min(100, Math.max(0, Math.round(progress)));

      if (clamped === lastProgress) {
        return;
      }

      lastProgress = clamped;
      lastEmitAt = Date.now();
      emit(clamped);
    },
  };
}
