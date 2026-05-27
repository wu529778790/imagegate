import { NextRequest, NextResponse } from "next/server";
import { getActiveKeyByProvider, addRecord, updateRecord } from "@/lib/db";
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

  let providerName = requestedProvider as Provider | undefined;
  let apiKeyRecord;

  if (providerName) {
    apiKeyRecord = getActiveKeyByProvider(providerName);
  } else {
    for (const name of ["zai", "xiaomi"] as Provider[]) {
      apiKeyRecord = getActiveKeyByProvider(name);
      if (apiKeyRecord) {
        providerName = name;
        break;
      }
    }
  }

  if (!apiKeyRecord || !providerName) {
    return NextResponse.json({ error: "No active API key found for provider" }, { status: 400 });
  }

  const resolvedModel = model || DEFAULT_MODELS[providerName];

  const record = addRecord({
    api_key_id: apiKeyRecord.id,
    provider: providerName,
    model: resolvedModel,
    prompt,
    parameters: JSON.stringify({ ar, quality }),
    status: "pending",
  });

  const startTime = Date.now();

  try {
    const provider = createProvider(providerName);
    const imageBuffer = await provider.generateImage(prompt, resolvedModel, apiKeyRecord.api_key, { aspectRatio: ar, quality });

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
