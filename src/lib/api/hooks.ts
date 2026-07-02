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
  RecordFilters,
} from "@/types/api";
import type { GenerateParams } from "@/types/generation";
import { toQuery } from "@/lib/api/query-string";

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

/** Parameters accepted by the filtered images hook. */
export interface ImageFilters {
  status?: "all" | "success" | "failed" | "pending";
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Fetch the user's images with status / search filters.
 * Pass `null` to unmount (SWR conditional fetch).
 */
export function useFilteredImages(filters: ImageFilters | null) {
  const query = filters
    ? toQuery({
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        search: filters.search,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      })
    : null;

  return useSWR<ImagesResponse>(
    query ? `/api/images?${query}` : null,
    swrFetcher,
    { keepPreviousData: true },
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
// Filtered records ( with search / status / provider )
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export interface FavoritesResponse {
  favorites: Array<{
    id: number;
    record_id: number;
    collection: string;
    created_at: string;
  }>;
  collections: string[];
}

export function useFavorites(collection: string | null) {
  const key = collection ? `/api/favorites?collection=${encodeURIComponent(collection)}` : null;
  return useSWR<FavoritesResponse>(key, swrFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

export function useFavoriteCollections() {
  return useSWR<FavoritesResponse>("/api/favorites", swrFetcher, {
    revalidateOnFocus: false,
  });
}

async function favoriteSender(
  url: string,
  { arg }: { arg: { collection: string; action: "add" | "remove" } },
): Promise<void> {
  // url already contains the /api/records/:id path. We just fetch it with the body.
  await apiClient.post(url, arg);
}

export function useFavoriteMutation(recordId: number) {
  return useSWRMutation(`/api/records/${recordId}/favorite`, favoriteSender);
}

async function collectionSender(
  url: string,
  { arg }: { arg: { mode: string; name?: string; oldName?: string; newName?: string } },
): Promise<void> {
  if (arg.mode === "create") {
    await apiClient.post(url, { name: arg.name });
  } else if (arg.mode === "rename") {
    await apiClient.post(url, { action: "rename", oldName: arg.oldName, newName: arg.newName });
  } else if (arg.mode === "delete") {
    await apiClient.post(url, { action: "delete", name: arg.name });
  }
}

export function useCollectionMutation() {
  return useSWRMutation("/api/favorites", collectionSender);
}

// ---------------------------------------------------------------------------
// Records (filtered)
// ---------------------------------------------------------------------------

/**
 * Fetch paginated generation records with arbitrary filters.
 * Passing `null` unmounts the request (SWR conditional fetch).
 */
export function useFilteredRecords(filters: RecordFilters | null) {
  const query = filters
    ? toQuery({
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        provider: filters.provider,
        search: filters.search,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      })
    : null;

  return useSWR<RecordsResponse>(
    query ? `/api/records?${query}` : null,
    swrFetcher,
    { keepPreviousData: true },
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
