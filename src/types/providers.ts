/** Provider metadata for UI display. */
export interface ProviderMeta {
  name: string;
  label: string;
  color: string;
  developerUrl: string;
  description: string;
  fields: ProviderField[];
}

export interface ProviderField {
  key: string;
  label: string;
  placeholder: string;
  type?: "password" | "text";
}

/** Provider color map used across badges and selectors. */
export const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
  zai: "#8b5cf6",
  google: "#4285f4",
  dashscope: "#8b5cf6",
  minimax: "#8b5cf6",
  replicate: "#8b5cf6",
  jimeng: "#ec4899",
  seedream: "#8b5cf6",
  azure: "#8b5cf6",
  openrouter: "#8b5cf6",
};

/** Provider label map for UI display. */
export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
};

/** All configured providers with form field definitions. */
export const PROVIDERS: ProviderMeta[] = [
  {
    name: "openai",
    label: "OpenAI 兼容",
    color: "#10a37f",
    developerUrl: "https://platform.openai.com/api-keys",
    description: "支持 OpenAI、通义、智谱、豆包、Google 等所有兼容 OpenAI 格式的服务",
    fields: [
      { key: "openai_api_key", label: "API Key", placeholder: "输入 API Key", type: "password" },
      { key: "openai_base_url", label: "Base URL", placeholder: "https://api.openai.com/v1" },
      { key: "openai_model", label: "模型", placeholder: "gpt-image-2" },
    ],
  },
  {
    name: "anthropic",
    label: "Anthropic",
    color: "#d97706",
    developerUrl: "https://console.anthropic.com/settings/keys",
    description: "Claude 系列模型，支持图片生成",
    fields: [
      { key: "anthropic_api_key", label: "API Key", placeholder: "输入 Anthropic API Key", type: "password" },
      { key: "anthropic_base_url", label: "Base URL", placeholder: "https://api.anthropic.com" },
      { key: "anthropic_model", label: "模型", placeholder: "claude-sonnet-4-20250514" },
    ],
  },
];
