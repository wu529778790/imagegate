/** Image item from API / gallery. */
export interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
  provider: string;
  model?: string;
  createdAt: string;
  generationId: number;
  /** Backend status string ("success" | "failed" | "pending"). */
  generationStatus: string;
  generationDuration?: number;
  /** GitHub path when synced — used to show the synced badge. */
  githubPath?: string;
}

/** Filter status for the gallery. `"all"` = no filter. */
export type GalleryFilterStatus = "all" | "success" | "failed" | "pending";

export const GALLERY_STATUS_OPTIONS: Array<{ value: GalleryFilterStatus; label: string }> = [
  { value: "all", label: "全部" },
  { value: "success", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "pending", label: "进行中" },
];

/** Paginated image list response. */
export interface ImageListResponse {
  images: ImageItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Sync status from API. */
export interface SyncStatus {
  user: {
    totalImages: number;
    syncedImages: number;
    pendingImages: number;
  };
  queue: {
    pending: number;
    processing: boolean;
  };
}
