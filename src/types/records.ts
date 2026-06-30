/** Generation record status. */
export type RecordStatus = "success" | "failed" | "pending" | "running";

/** Generation record from API. */
export interface GenerationRecord {
  id: number;
  user_id: string;
  prompt: string;
  provider: string;
  ar: string;
  quality: string;
  model?: string;
  image_base64: string;
  created_at: string;
  status: RecordStatus;
  error_message?: string;
  duration_ms?: number;
}

/** Stats about generation records. */
export interface RecordStats {
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
  totalToday: number;
}

/** Status display config. */
export interface StatusConfig {
  color: string;
  label: string;
}

export const STATUS_CONFIG: Record<RecordStatus, StatusConfig> = {
  success: { color: "#22c55e", label: "成功" },
  failed: { color: "#ef4444", label: "失败" },
  pending: { color: "#eab308", label: "进行中" },
  running: { color: "#8b5cf6", label: "运行中" },
};
