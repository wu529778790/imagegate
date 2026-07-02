"use client";

import useSWRMutation from "swr/mutation";
import { apiClient } from "@/lib/api/client";

/** POST /api/images/delete?id=N → remove a user-owned image. */
async function deleteImageSender(
  url: string,
  { arg }: { arg: number },
): Promise<void> {
  await apiClient.post<void>(`${url}?id=${arg}`, {});
}

export function useDeleteImage() {
  return useSWRMutation("/api/images/delete", deleteImageSender);
}

/** POST /api/records?id=N → remove a generation record. */
async function deleteRecordSender(
  url: string,
  { arg }: { arg: number },
): Promise<void> {
  await apiClient.delete(`${url}?id=${arg}`);
}

export function useDeleteRecord() {
  return useSWRMutation("/api/records", deleteRecordSender);
}
