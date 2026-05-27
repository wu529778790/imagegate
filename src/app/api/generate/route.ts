import { NextRequest, NextResponse } from "next/server";
import { getSetting, getActiveKeyByProvider, addRecord, updateRecord } from "@/lib/db";
import { createProvider } from "@/providers";
import type { Provider } from "@/providers";

const DEFAULT_MODELS: Record<Provider, string> = {
  zai: "glm-image",
  xiaomi: "xiaomi-image",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, provider: requestedProvider, model, ar, quality } = body;

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  // Resolve provider: from request > from settings > auto-detect from api_keys
  let providerName = requestedProvider as Provider | undefined;
  let apiKey: string | undefined;

  if (providerName) {
    // Try settings table first, then api_keys table
    apiKey = getSetting(`${providerName}_api_key`) ?? undefined;
    if (!apiKey) {
      const keyRecord = getActiveKeyByProvider(providerName);
      apiKey = keyRecord?.api_key;
    }
  } else {
    // Auto-detect: check settings first, then api_keys
    const defaultProvider = (getSetting("default_provider") ?? "zai") as Provider;
    apiKey = getSetting(`${defaultProvider}_api_key`) ?? undefined;
    if (apiKey) {
      providerName = defaultProvider;
    } else {
      for (const name of ["zai", "xiaomi"] as Provider[]) {
        const keyRecord = getActiveKeyByProvider(name);
        if (keyRecord) {
          apiKey = keyRecord.api_key;
          providerName = name;
          break;
        }
      }
    }
  }

  if (!apiKey || !providerName) {
    return NextResponse.json({ error: "No API key configured. Go to Settings to add one." }, { status: 400 });
  }

  // Resolve model: from request > from settings > from provider default
  const resolvedModel = model || getSetting(`${providerName}_model`) || DEFAULT_MODELS[providerName];

  // Resolve base URL from settings
  const baseUrl = getSetting(`${providerName}_base_url`) || undefined;

  const record = addRecord({
    provider: providerName,
    model: resolvedModel,
    prompt,
    parameters: JSON.stringify({ ar, quality }),
    status: "pending",
  });

  const startTime = Date.now();

  try {
    const provider = createProvider(providerName, { baseUrl });
    const imageBuffer = await provider.generateImage(prompt, resolvedModel, apiKey, { aspectRatio: ar, quality });

    const durationMs = Date.now() - startTime;

    updateRecord(record.id, {
      status: "success",
      duration_ms: durationMs,
    });

    return NextResponse.json({
      success: true,
      image: imageBuffer.toString("base64"),
      provider: providerName,
      model: resolvedModel,
      duration_ms: durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    updateRecord(record.id, {
      status: "failed",
      error_message: errorMessage,
      duration_ms: durationMs,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
