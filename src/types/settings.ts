/** User settings stored in the backend. */
export interface UserSettings {
  default_provider?: string;
  default_ar?: string;
  default_quality?: string;
  openai_api_key?: string;
  openai_base_url?: string;
  openai_model?: string;
  anthropic_api_key?: string;
  anthropic_base_url?: string;
  anthropic_model?: string;
}

export type { Quality } from "@/providers/types";
