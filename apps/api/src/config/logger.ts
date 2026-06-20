import type { FastifyServerOptions } from 'fastify';

import { env } from './env.ts';

export function isDevelopmentLogger(): boolean {
  return env.NODE_ENV === 'development';
}

export function createLoggerConfig(): FastifyServerOptions['logger'] {
  if (isDevelopmentLogger()) {
    return {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,reqId,req,res,responseTime',
          singleLine: true,
        },
      },
      hooks: {
        logMethod(inputArgs, method) {
          const message = inputArgs.find((arg): arg is string => typeof arg === 'string');

          if (message !== undefined && message.length === 0) {
            return;
          }

          method.apply(this, inputArgs);
        },
      },
    };
  }

  return true;
}

export function createListenTextResolver(port: number): (address: string) => string {
  return (address) => {
    if (address.includes('127.0.0.1')) {
      return `API em http://localhost:${port}`;
    }

    return `API em ${address}`;
  };
}
