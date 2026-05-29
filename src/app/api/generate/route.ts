import { NextRequest, NextResponse } from "next/server";
import { getSetting, getActiveKeyByProvider, getKeyIdByProviderAndKey, addRecord, updateRecord } from "@/lib/db";
import { createProvider } from "@/providers";
import type { Provider } from "@/providers";

const DEFAULT_MODELS: Record<Provider, string> = {
  zai: "cogview-3",
  openai: "gpt-image-2",
  google: "gemini-2.0-flash-preview-image-generation",
  openrouter: "google/gemini-2.0-flash-preview-image-generation",
  dashscope: "qwen-image-2.0-pro",
  minimax: "image-01",
  replicate: "google/nano-banana-2",
  jimeng: "jimeng_t2i_v40",
  seedream: "doubao-seedream-5-0-260128",
  azure: "gpt-image-2",
};

const VALID_PROVIDERS: Provider[] = [
  "zai",
  "openai",
  "google",
  "openrouter",
  "dashscope",
  "minimax",
  "replicate",
  "jimeng",
  "seedream",
  "azure",
];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, provider: requestedProvider, model, ar, quality, n, size } = body;

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  if (requestedProvider && !VALID_PROVIDERS.includes(requestedProvider)) {
    return NextResponse.json({ error: `Invalid provider: ${requestedProvider}. Must be one of: ${VALID_PROVIDERS.join(", ")}` }, { status: 400 });
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
      for (const name of VALID_PROVIDERS) {
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
    api_key_id: getKeyIdByProviderAndKey(providerName, apiKey),
    provider: providerName,
    model: resolvedModel,
    prompt,
    parameters: JSON.stringify({ ar, quality, size, n }),
    status: "pending",
  });

  const startTime = Date.now();

  try {
    const provider = createProvider(providerName, { baseUrl });
    const imageBuffer = await provider.generateImage(prompt, resolvedModel, apiKey, { aspectRatio: ar, quality, n, size });

    const durationMs = Date.now() - startTime;
    const imageData = `data:image/png;base64,${imageBuffer.toString("base64")}`;

    updateRecord(record.id, {
      status: "success",
      duration_ms: durationMs,
      image_url: imageData,
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
