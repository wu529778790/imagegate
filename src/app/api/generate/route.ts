import { NextRequest, NextResponse } from "next/server";
import { getSetting, getActiveKeyByProvider, getKeyIdByProviderAndKey, addRecord, updateRecord, getDb } from "@/lib/db";
import { createProvider } from "@/providers";
import type { Provider } from "@/providers";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { addToSyncQueue } from "@/lib/sync";
import { GenerateImageSchema, validate } from "@/lib/validation";
import { createErrorResponse } from "@/lib/errors";

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

async function saveImageToLocalStorage(
  userId: number,
  imageBuffer: Buffer,
  provider: string,
  model: string,
  prompt: string,
  generationId: number
): Promise<{ localPath: string; imageUrl: string }> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const timestamp = Date.now();
  const filename = `${timestamp}_${provider}_${model.replace(/[^a-zA-Z0-9]/g, "_")}.png`;

  // Create directory structure: data/images/{userId}/{year}/{month}/{day}/
  const relativePath = path.join("images", String(userId), String(year), month, day, filename);
  const fullPath = path.join(process.cwd(), "data", relativePath);

  // Ensure directory exists
  await mkdir(path.dirname(fullPath), { recursive: true });

  // Write file
  await writeFile(fullPath, imageBuffer);

  // Store metadata in database
  const db = getDb();
  db.prepare(`
    INSERT INTO images (user_id, generation_id, local_path, prompt, provider, model, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(userId, generationId, relativePath, prompt, provider, model);

  // Return the API URL for serving the image
  const imageUrl = `/api/images/${userId}/${year}/${month}/${day}/${filename}`;

  return { localPath: relativePath, imageUrl };
}

export async function POST(request: NextRequest) {
  try {
    // Get current user session (optional - allows anonymous usage)
    const session = await auth();
    const userId = session?.user?.id ? parseInt(session.user.id) : null;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validate(GenerateImageSchema, body);
    const { prompt, provider: requestedProvider, model, ar, quality, n, size } = validatedData;

    if (requestedProvider && !VALID_PROVIDERS.includes(requestedProvider)) {
      return NextResponse.json(
        { error: { code: "INVALID_PROVIDER", message: `Invalid provider: ${requestedProvider}` } },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: { code: "NO_API_KEY", message: "No API key configured. Go to Settings to add one." } },
        { status: 400 }
      );
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

      // Update record with success status
      updateRecord(record.id, {
        status: "success",
        duration_ms: durationMs,
        image_url: imageData,
      });

      // If user is logged in, save image to local storage
      let savedImage = null;
      if (userId) {
        try {
          savedImage = await saveImageToLocalStorage(
            userId,
            imageBuffer,
            providerName,
            resolvedModel,
            prompt,
            record.id
          );

          // Add to sync queue for GitHub upload (async, non-blocking)
          if (savedImage) {
            const db = getDb();
            const imageRecord = db.prepare(
              "SELECT id FROM images WHERE local_path = ?"
            ).get(savedImage.localPath) as { id: number } | undefined;

            if (imageRecord) {
              addToSyncQueue(
                userId,
                imageRecord.id,
                savedImage.localPath,
                providerName,
                resolvedModel,
                prompt
              ).catch((syncError) => {
                console.error("Failed to add to sync queue:", syncError);
                // Don't fail the request if sync queue fails
              });
            }
          }
        } catch (saveError) {
          console.error("Failed to save image to local storage:", saveError);
          // Don't fail the request if saving fails
        }
      }

      return NextResponse.json({
        success: true,
        image: imageBuffer.toString("base64"),
        provider: providerName,
        model: resolvedModel,
        duration_ms: durationMs,
        savedImage: savedImage ? {
          localPath: savedImage.localPath,
          imageUrl: savedImage.imageUrl,
        } : null,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      updateRecord(record.id, {
        status: "failed",
        error_message: errorMessage,
        duration_ms: durationMs,
      });

      // Return sanitized error message
      return NextResponse.json(
        { error: { code: "GENERATION_FAILED", message: "图片生成失败，请重试" } },
        { status: 500 }
      );
    }
  } catch (error) {
    return createErrorResponse(error, "GenerateAPI");
  }
}
