import type { FastifyServerOptions } from 'fastify';
import pino, { type Logger, type LoggerOptions } from 'pino';

import { env } from './env.ts';

export function isDevelopmentLogger(): boolean {
  return env.NODE_ENV === 'development';
}

function createPinoOptions(): LoggerOptions | true {
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

export function createLoggerConfig(): FastifyServerOptions['logger'] {
  return createPinoOptions();
}

let infraLogger: Logger | undefined;

export function getInfraLogger(): Logger {
  if (!infraLogger) {
    const options = createPinoOptions();
    infraLogger = options === true ? pino() : pino(options);
  }

  return infraLogger;
}

export function createListenTextResolver(
  port: number,
  options?: { secure?: boolean },
): (address: string) => string {
  return (address) => {
    const protocol = options?.secure ? 'https' : 'http';

    if (address.includes('127.0.0.1') || address.includes('0.0.0.0')) {
      if (options?.secure) {
        return `API em ${protocol}://api.playplus.localhost:${port}/v1`;
      }

      return `API em ${protocol}://localhost:${port}`;
    }

    return `API em ${protocol}://${address}`;
  };
}
