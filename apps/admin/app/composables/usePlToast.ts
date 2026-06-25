import type { Ref } from 'vue';
import { inject, provide, ref } from 'vue';

export type PlToastVariant = 'info' | 'success' | 'error';

export interface PlToastItem {
  id: string;
  message: string;
  variant: PlToastVariant;
}

const TOAST_KEY = Symbol('pl-toast');

interface PlToastContext {
  toasts: Ref<PlToastItem[]>;
  show: (message: string, variant?: PlToastVariant, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

export function providePlToast() {
  const toasts = ref<PlToastItem[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(toast => toast.id !== id);
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function show(message: string, variant: PlToastVariant = 'info', durationMs = 4000) {
    const id = crypto.randomUUID();
    toasts.value = [...toasts.value, { id, message, variant }];

    const timer = setTimeout(() => {
      dismiss(id);
    }, durationMs);
    timers.set(id, timer);
  }

  const context: PlToastContext = { toasts, show, dismiss };
  provide(TOAST_KEY, context);

  return context;
}

export function usePlToast() {
  const context = inject<PlToastContext>(TOAST_KEY);
  if (!context) {
    throw new Error('usePlToast must be used within a PlToast provider');
  }
  return context;
}
