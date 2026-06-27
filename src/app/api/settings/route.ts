import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

const SETTINGS_KEYS = [
  "default_provider",
  "default_quality",
  "default_ar",
  // OpenAI 兼容 (OpenAI, 通义, 智谱, 豆包, Google 等)
  "openai_api_key",
  "openai_base_url",
  "openai_model",
  // Anthropic (Claude)
  "anthropic_api_key",
  "anthropic_base_url",
  "anthropic_model",
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
