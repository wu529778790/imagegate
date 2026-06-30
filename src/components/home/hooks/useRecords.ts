/**
 * useRecords — Records data hook, now powered by SWR.
 *
 * Replaces manual fetch() + useState with SWR caching + revalidation.
 * Uses apiClient for DELETE mutation + SWR mutate for cache refresh.
 * No local type definitions — imports GenerationRecord from @/types.
 */

'use client';

import { useState, useCallback } from "react";
import useSWR from "swr";
import { swrFetcher, apiClient } from "@/lib/api/client";
import type { RecordsResponse } from "@/types/api";
import type { GenerationRecord } from "@/types/records";

export function useRecords() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    data,
    error: swrError,
    isLoading: recordsLoading,
    mutate,
  } = useSWR<RecordsResponse>(
    `/api/records?page=${page}&pageSize=${pageSize}`,
    swrFetcher,
    { keepPreviousData: true }
  );

  const records: GenerationRecord[] = data?.records ?? [];
  const total = data?.total ?? 0;

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await apiClient.delete(`/api/records?id=${id}`);
        // Refresh SWR cache after deletion
        await mutate();
      } catch (err: unknown) {
        // Surface error instead of silent catch
        if (err instanceof Error) {
          console.error("Failed to delete record:", err.message);
        }
      }
    },
    [mutate]
  );

  return {
    records,
    recordsLoading,
    page,
    total,
    setPage,
    handleDelete,
    swrError,
  };
}

// Re-export for backward compatibility during migration
export type { GenerationRecord as RecordItem };
