import { createRequire } from 'node:module';

import pino, { type Logger } from 'pino';

import { env } from './env.ts';

const require = createRequire(import.meta.url);

function isDevelopmentLogger(): boolean {
  return env.NODE_ENV === 'development';
}

function createDevelopmentLogger(): Logger {
  const pinoPretty = require('pino-pretty') as (options: {
    translateTime: string;
    ignore: string;
    singleLine: boolean;
  }) => NodeJS.WritableStream;

  return pino(
    {
      hooks: {
        logMethod(inputArgs, method) {
          const message = inputArgs.find((arg): arg is string => typeof arg === 'string');

          if (message !== undefined && message.length === 0) {
            return;
          }

          method.apply(this, inputArgs);
        },
      },
    },
    pinoPretty({
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: true,
    }),
  );
}

let loggerInstance: Logger | undefined;

function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = isDevelopmentLogger() ? createDevelopmentLogger() : pino();
  }

  return loggerInstance;
}

export const logger = getLogger();
