"use client";

import { useState, useEffect, useCallback } from "react";

interface RecordItem {
  id: number;
  provider: string;
  model: string;
  prompt: string;
  status: string;
  duration_ms: number;
  created_at: string;
}

export function useRecords() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRecords = useCallback(async (p = 1) => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/records?page=${p}&pageSize=20`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch {
      /* silent */
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords(page);
  }, [page, loadRecords]);

  const handleDelete = useCallback(
    async (id: number) => {
      await fetch(`/api/records?id=${id}`, { method: "DELETE" });
      loadRecords(page);
    },
    [page, loadRecords]
  );

  return {
    records,
    recordsLoading,
    page,
    total,
    setPage,
    loadRecords,
    handleDelete,
  };
}

export type { RecordItem };
