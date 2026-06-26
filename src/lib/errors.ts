/**
 * Error handling utilities.
 * Sanitizes error messages for user-facing responses.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

export class ProviderError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string, statusCode: number = 500) {
    super(message, statusCode, "PROVIDER_ERROR");
    this.name = "ProviderError";
    this.provider = provider;
  }
}

// ---------------------------------------------------------------------------
// Error sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize error message for user-facing response.
 * Removes internal details and sensitive information.
 */
function sanitizeErrorMessage(error: Error): string {
  // For operational errors, return the message as-is
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  // For Zod validation errors, format nicely
  if (error instanceof ZodError) {
    const errorList = (error as any).issues || (error as any).errors || [];
    return errorList
      .map((e: any) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
  }

  // For unknown errors, return generic message
  return "An unexpected error occurred. Please try again later.";
}

/**
 * Get error code from error
 */
function getErrorCode(error: Error): string {
  if (error instanceof AppError) {
    return error.code;
  }
  return "INTERNAL_ERROR";
}

/**
 * Get status code from error
 */
function getStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

// ---------------------------------------------------------------------------
// Error response helpers
// ---------------------------------------------------------------------------

/**
 * Create an error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  context?: string
): NextResponse {
  const err = error instanceof Error ? error : new Error(String(error));
  const statusCode = getStatusCode(err);
  const code = getErrorCode(err);
  const message = sanitizeErrorMessage(err);

  // Log internal errors for debugging
  if (statusCode >= 500) {
    console.error(`[${context || "API"}] Internal error:`, {
      message: err.message,
      stack: err.stack,
      code,
    });
  }

  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === "development" && statusCode >= 500
          ? { stack: err.stack }
          : {}),
      },
    },
    { status: statusCode }
  );
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error, context);
    }
  }) as T;
}

// ---------------------------------------------------------------------------
// User-friendly error messages
// ---------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  // Authentication
  AUTH_REQUIRED: "请先登录",
  AUTH_INVALID: "认证信息无效",
  AUTH_EXPIRED: "登录已过期，请重新登录",

  // Authorization
  ACCESS_DENIED: "没有权限执行此操作",

  // Validation
  INVALID_INPUT: "输入数据无效",
  MISSING_FIELD: (field: string) => `缺少必填字段: ${field}`,
  INVALID_FORMAT: (field: string) => `${field} 格式不正确`,

  // Resources
  NOT_FOUND: "资源不存在",
  ALREADY_EXISTS: "资源已存在",

  // Rate limiting
  RATE_LIMITED: "请求过于频繁，请稍后再试",

  // Provider errors
  PROVIDER_ERROR: (provider: string) => `${provider} 服务暂时不可用，请稍后再试`,
  PROVIDER_AUTH_ERROR: (provider: string) => `${provider} API 密钥无效或已过期`,
  PROVIDER_QUOTA_ERROR: (provider: string) => `${provider} API 配额已用完`,

  // Image generation
  GENERATION_FAILED: "图片生成失败，请重试",
  GENERATION_TIMEOUT: "图片生成超时，请重试",

  // Sync
  SYNC_FAILED: "同步失败，请重试",
  SYNC_AUTH_ERROR: "GitHub 授权已过期，请重新登录",

  // General
  INTERNAL_ERROR: "服务器内部错误，请稍后再试",
  NETWORK_ERROR: "网络错误，请检查网络连接",
} as const;
