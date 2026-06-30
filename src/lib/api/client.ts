/**
 * Unified API client for ImageGate.
 * Handles all HTTP requests with consistent error handling,
 * typed responses, and no silent failures.
 */

// ---------------------------------------------------------------------------
// Client-side API error ( mirrors server-side AppError but for frontend )
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code: string = "API_ERROR") {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

class ApiClient {
  private baseUrl = "";

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({
        error: { message: "请求失败", code: "NETWORK_ERROR" },
      }));
      throw new ApiClientError(
        res.status,
        errorBody.error?.message || "请求失败",
        errorBody.error?.code || "API_ERROR"
      );
    }
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({
        error: { message: "请求失败", code: "NETWORK_ERROR" },
      }));
      throw new ApiClientError(
        res.status,
        errorBody.error?.message || "请求失败",
        errorBody.error?.code || "API_ERROR"
      );
    }
    return res.json() as Promise<T>;
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({
        error: { message: "请求失败", code: "NETWORK_ERROR" },
      }));
      throw new ApiClientError(
        res.status,
        errorBody.error?.message || "请求失败",
        errorBody.error?.code || "API_ERROR"
      );
    }
    return res.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();

// ---------------------------------------------------------------------------
// SWR fetcher ( wraps apiClient.get for use with SWR )
// ---------------------------------------------------------------------------

export const swrFetcher = <T>(url: string): Promise<T> => apiClient.get<T>(url);
