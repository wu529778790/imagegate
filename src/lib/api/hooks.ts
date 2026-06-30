/**
 * SWR-based data hooks for ImageGate.
 * Replaces all scattered fetch() calls with cached, retryable, race-condition-safe hooks.
 *
 * Design principles:
 * - SWR handles caching, revalidation, and race condition cancellation
 * - All hooks return { data, error, isLoading, mutate } — consistent interface
 * - No silent failures — errors surface through SWR's error channel
 */

'use client';

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { swrFetcher, apiClient } from "@/lib/api/client";
import type {
  SettingsResponse,
  RecordsResponse,
  ImagesResponse,
  StatsResponse,
  GenerateResponse,
} from "@/types/api";
import type { GenerateParams } from "@/types/generation";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function useSettings() {
  return useSWR<SettingsResponse>("/api/settings", swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000, // 1 min dedup — settings rarely change
  });
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export function useRecords(page: number, pageSize: number = 20) {
  return useSWR<RecordsResponse>(
    `/api/records?page=${page}&pageSize=${pageSize}`,
    swrFetcher,
    { keepPreviousData: true }
  );
}

// ---------------------------------------------------------------------------
// Images / Gallery
// ---------------------------------------------------------------------------

export function useImages(page: number, pageSize: number = 20) {
  return useSWR<ImagesResponse>(
    `/api/images?page=${page}&pageSize=${pageSize}`,
    swrFetcher,
    { keepPreviousData: true }
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function useStats() {
  return useSWR<StatsResponse>("/api/stats", swrFetcher, {
    refreshInterval: 30_000, // auto-refresh stats every 30s
  });
}

// ---------------------------------------------------------------------------
// Generate ( mutation — not cached )
// ---------------------------------------------------------------------------

async function generateSender(
  url: string,
  { arg }: { arg: GenerateParams }
): Promise<GenerateResponse> {
  const body: Record<string, string> = {
    prompt: arg.prompt,
    provider: arg.provider,
    ar: arg.ar,
    quality: arg.quality,
  };
  if (arg.model) body.model = arg.model;

  return apiClient.post<GenerateResponse>(url, body);
}

export function useGenerateMutation() {
  return useSWRMutation<GenerateResponse, unknown, string, GenerateParams>(
    "/api/generate",
    generateSender
  );
}

// ---------------------------------------------------------------------------
// Delete record ( mutation )
// ---------------------------------------------------------------------------

async function deleteRecordSender(
  url: string,
  { arg }: { arg: number }
): Promise<void> {
  await apiClient.delete(`${url}?id=${arg}`);
}

export function useDeleteRecord() {
  return useSWRMutation<void, unknown, string, number>(
    "/api/records",
    deleteRecordSender
  );
}

// ---------------------------------------------------------------------------
// SWR global config provider ( used in layout )
// ---------------------------------------------------------------------------

export { SWRConfig } from "swr";
