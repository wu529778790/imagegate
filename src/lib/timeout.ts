/**
 * Request timeout utilities.
 * Provides timeout control for long-running operations.
 */

import { NextResponse } from "next/server";

export class TimeoutError extends Error {
  constructor(message: string = "Request timeout") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Execute a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
}

/**
 * Wrap fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;

  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Pre-configured timeout values for different operations
 */
export const TIMEOUT_CONFIG = {
  // API calls to external services
  API_CALL: 30000, // 30 seconds

  // Image generation (can be slow)
  IMAGE_GENERATION: 120000, // 2 minutes

  // Database queries
  DATABASE: 5000, // 5 seconds

  // File operations
  FILE_OPERATION: 10000, // 10 seconds

  // GitHub API calls
  GITHUB_API: 15000, // 15 seconds

  // Sync operations
  SYNC_OPERATION: 60000, // 1 minute
} as const;

/**
 * Create a timeout response for API routes
 */
export function createTimeoutResponse(
  operation: string = "Request"
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "TIMEOUT",
        message: `${operation} 超时，请重试`,
      },
    },
    { status: 408 }
  );
}

/**
 * Execute with timeout and return timeout response on failure
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string = "Operation"
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const data = await withTimeout(operation(), timeoutMs);
    return { success: true, data };
  } catch (error) {
    if (error instanceof TimeoutError) {
      return {
        success: false,
        response: createTimeoutResponse(operationName),
      };
    }
    throw error;
  }
}
