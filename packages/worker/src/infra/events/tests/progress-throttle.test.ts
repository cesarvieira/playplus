import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgressThrottle } from '../progress-throttle.ts';

describe('createProgressThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emite imediatamente o primeiro progresso', () => {
    const emit = vi.fn();
    const throttle = createProgressThrottle(emit, 5_000);

    throttle.report(10);

    expect(emit).toHaveBeenCalledWith(10);
  });

  it('limita emissões ao intervalo configurado', () => {
    const emit = vi.fn();
    const throttle = createProgressThrottle(emit, 5_000);

    throttle.report(10);
    throttle.report(20);
    throttle.report(30);

    expect(emit).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5_000);
    throttle.report(40);

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith(40);
  });

  it('flush emite progresso final mesmo dentro do intervalo', () => {
    const emit = vi.fn();
    const throttle = createProgressThrottle(emit, 5_000);

    throttle.report(50);
    throttle.flush(100);

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith(100);
  });

  it('report com force ignora o throttle', () => {
    const emit = vi.fn();
    const throttle = createProgressThrottle(emit, 5_000);

    throttle.report(0, { force: true });
    throttle.report(5, { force: true });

    expect(emit).toHaveBeenCalledTimes(2);
  });
});
