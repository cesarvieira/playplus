interface AppLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const getConsole = () => {
  if (typeof window !== 'undefined' && 'console' in window) {
    return (window as unknown as { console: Record<string, (...args: unknown[]) => void> }).console;
  }
  if (typeof globalThis !== 'undefined' && 'console' in globalThis) {
    return (globalThis as unknown as { console: Record<string, (...args: unknown[]) => void> }).console;
  }
  return null;
};

const consoleObj = getConsole();

export const logger: AppLogger = {
  info(message: string, ...args: unknown[]) {
    if (import.meta.dev) {
      consoleObj?.info?.(`[Play+] INFO: ${message}`, ...args);
    }
  },
  warn(message: string, ...args: unknown[]) {
    consoleObj?.warn?.(`[Play+] WARN: ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]) {
    consoleObj?.error?.(`[Play+] ERROR: ${message}`, ...args);
  },
};
