import { Logger } from '@nestjs/common';

export class AppLogger extends Logger {
  private static instance: AppLogger;

  static getInstance(context?: string): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = new AppLogger(context || 'App');
    }
    return AppLogger.instance;
  }

  // Production-safe logging methods
  logInfo(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.log(message, context);
    }
  }

  logDebug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      this.debug(message, context);
    }
  }

  logError(message: string, error?: any, context?: string) {
    this.error(message, error?.stack || error, context);
  }

  logWarn(message: string, context?: string) {
    this.warn(message, context);
  }
} 