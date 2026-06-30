import type { Quality } from "@/providers/types";

export type { Quality };

/** Available aspect ratio options. */
export const AR_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

export type AspectRatio = (typeof AR_OPTIONS)[number];

/** Quality option configs. */
export const QUALITY_OPTIONS: Array<{ label: string; value: Quality }> = [
  { label: "标准", value: "normal" },
  { label: "高清", value: "2k" },
];

/** Generation params used across the app. */
export interface GenerateParams {
  prompt: string;
  provider: string;
  model?: string;
  ar: AspectRatio;
  quality: Quality;
}
