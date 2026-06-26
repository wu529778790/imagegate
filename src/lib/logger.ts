/**
 * Structured logging utility.
 * Provides consistent, structured logs for debugging and monitoring.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  requestId?: string;
}

class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context: string = "App", level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level);
  }

  /**
   * Format and output a log entry
   */
  private log(entry: LogEntry): void {
    const output = JSON.stringify(entry, null, process.env.NODE_ENV === "development" ? 2 : 0);

    switch (entry.level) {
      case "DEBUG":
        console.debug(output);
        break;
      case "INFO":
        console.log(output);
        break;
      case "WARN":
        console.warn(output);
        break;
      case "ERROR":
        console.error(output);
        break;
    }
  }

  /**
   * Create a base log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: this.context,
    };

    if (data) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      };
    }

    return entry;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log(this.createEntry(LogLevel.DEBUG, message, data));
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      this.log(this.createEntry(LogLevel.INFO, message, data));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      this.log(this.createEntry(LogLevel.WARN, message, data));
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      this.log(this.createEntry(LogLevel.ERROR, message, data, error));
    }
  }

  /**
   * Log a request start
   */
  requestStart(requestId: string, method: string, path: string, data?: Record<string, unknown>): void {
    this.info(`Request started: ${method} ${path}`, {
      requestId,
      method,
      path,
      ...data,
    });
  }

  /**
   * Log a request end
   */
  requestEnd(
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 400 ? "WARN" : "INFO",
      message: `Request completed: ${method} ${path} ${statusCode}`,
      context: this.context,
      duration,
      requestId,
      data: {
        method,
        path,
        statusCode,
        durationMs: duration,
        ...data,
      },
    };

    this.log(entry);
  }

  /**
   * Log an API call to external service
   */
  apiCall(
    service: string,
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    this.info(`API call: ${service} ${method} ${path}`, {
      service,
      method,
      path,
      statusCode,
      durationMs: duration,
      ...data,
    });
  }

  /**
   * Log a database query
   */
  dbQuery(query: string, duration: number, data?: Record<string, unknown>): void {
    this.debug(`DB query: ${query}`, {
      query,
      durationMs: duration,
      ...data,
    });
  }

  /**
   * Log image generation
   */
  imageGeneration(
    provider: string,
    model: string,
    success: boolean,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = success
      ? `Image generated: ${provider}/${model}`
      : `Image generation failed: ${provider}/${model}`;

    if (this.level <= level) {
      this.log(
        this.createEntry(level, message, {
          provider,
          model,
          success,
          durationMs: duration,
          ...data,
        })
      );
    }
  }

  /**
   * Log sync operation
   */
  syncOperation(
    operation: string,
    success: boolean,
    data?: Record<string, unknown>
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = success
      ? `Sync operation completed: ${operation}`
      : `Sync operation failed: ${operation}`;

    if (this.level <= level) {
      this.log(
        this.createEntry(level, message, {
          operation,
          success,
          ...data,
        })
      );
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger(
  "ImageGate",
  process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO
);

export { Logger };
export default defaultLogger;

/**
 * Create a request-scoped logger with trace ID
 */
export function createRequestLogger(requestId: string): Logger {
  return new Logger(`Request:${requestId}`);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  logger: Logger,
  operation: string,
  data?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.debug(`${operation} completed`, { durationMs: duration, ...data });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`${operation} failed`, error as Error, { durationMs: duration, ...data });
    throw error;
  }
}
