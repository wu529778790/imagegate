/**
 * API response contract types.
 * These are the types that the frontend expects from the backend APIs.
 * All API hooks should reference these types instead of defining their own.
 */

import type { ImageItem } from "@/types/images";
import type { GenerationRecord } from "@/types/records";

// ---------------------------------------------------------------------------
// Generic API envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------

export interface SettingsResponse {
  default_provider: string;
  default_ar: string;
  default_quality: string;
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Records API
// ---------------------------------------------------------------------------

export interface RecordsResponse {
  records: GenerationRecord[];
  total: number;
}

/**
 * Query parameters accepted by GET /api/records.
 * Shared between the route handler and the useFilteredRecords SWR hook.
 */
export interface RecordFilters {
  /** Filter by generation status. `"all"` = no status filter. */
  status?: "all" | "success" | "failed" | "pending";
  /** Filter by provider name (e.g. `"openai"`). */
  provider?: string;
  /** Case-insensitive LIKE match on the prompt text. */
  search?: string;
  /** 1-based page number. */
  page?: number;
  /** Number of records per page. */
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Images API
// ---------------------------------------------------------------------------

export interface ImagesResponse {
  images: ImageItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Stats API
// ---------------------------------------------------------------------------

export interface StatsResponse {
  total: number;
  success: number;
  failed: number;
  todayCount: number;
  avgDuration: number;
  providerCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Generate API
// ---------------------------------------------------------------------------

export interface GenerateResponse {
  image: string;
  provider: string;
  model: string;
  duration_ms: number;
}

// ---------------------------------------------------------------------------
// Batch generation ( frontend-only state )
// ---------------------------------------------------------------------------

export type BatchItemStatus = "pending" | "running" | "success" | "error";

export interface BatchItem {
  prompt: string;
  status: BatchItemStatus;
  result?: GenerateResponse;
  error?: string;
}
