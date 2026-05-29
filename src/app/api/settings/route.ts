import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

const SETTINGS_KEYS = [
  "default_provider",
  "default_quality",
  "default_ar",
  // Z.AI (智谱)
  "zai_api_key",
  "zai_base_url",
  "zai_model",
  // OpenAI
  "openai_api_key",
  "openai_base_url",
  "openai_model",
  // Google (Gemini)
  "google_api_key",
  "google_base_url",
  "google_model",
  // OpenRouter
  "openrouter_api_key",
  "openrouter_base_url",
  "openrouter_model",
  // DashScope (通义万相)
  "dashscope_api_key",
  "dashscope_base_url",
  "dashscope_model",
  // MiniMax
  "minimax_api_key",
  "minimax_base_url",
  "minimax_model",
  // Replicate
  "replicate_api_key",
  "replicate_base_url",
  "replicate_model",
  // Jimeng (即梦)
  "jimeng_api_key",
  "jimeng_base_url",
  "jimeng_model",
  // Seedream (豆包)
  "seedream_api_key",
  "seedream_base_url",
  "seedream_model",
  // Azure OpenAI
  "azure_api_key",
  "azure_base_url",
  "azure_model",
];

export async function GET() {
  const settings: Record<string, string | null> = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = getSetting(key);
  }
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    if (SETTINGS_KEYS.includes(key) && typeof value === "string") {
      setSetting(key, value);
    }
  }

  return NextResponse.json({ success: true });
}
