/** Image item from API / gallery. */
export interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
  provider: string;
  model?: string;
  createdAt: string;
  generationId: number;
  generationStatus: string;
  generationDuration?: number;
  githubPath?: string;
}

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
