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
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit";
import { generateRequestId, createRequestLogger } from "@/lib/logger";
import { withTimeout, TIMEOUT_CONFIG, TimeoutError, createTimeoutResponse } from "@/lib/timeout";

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-image-2",
  anthropic: "claude-sonnet-4-20250514",
};

const VALID_PROVIDERS: Provider[] = ["openai", "anthropic"];

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
  const requestId = generateRequestId();
  const reqLogger = createRequestLogger(requestId);
  const startTime = Date.now();

  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.generate);
    if (rateLimitResponse) {
      reqLogger.warn("Rate limit exceeded", { ip: request.headers.get("x-forwarded-for") });
      return rateLimitResponse;
    }

    reqLogger.requestStart(requestId, "POST", "/api/generate");

    // Get current user session (optional - allows anonymous usage)
    const session = await auth();
    const userId = session?.user?.id ? parseInt(session.user.id) : null;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validate(GenerateImageSchema, body);
    const { prompt, provider: requestedProvider, model, ar, quality, n, size } = validatedData;

    if (requestedProvider && !VALID_PROVIDERS.includes(requestedProvider)) {
      reqLogger.warn("Invalid provider requested", { provider: requestedProvider });
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
    const defaultProvider = (getSetting("default_provider") ?? "openai") as Provider;
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
      reqLogger.warn("No API key configured");
      return NextResponse.json(
        { error: { code: "NO_API_KEY", message: "No API key configured. Go to Settings to add one." } },
        { status: 400 }
      );
    }

    // Resolve model: from request > from settings > from provider default
    const resolvedModel = model || getSetting(`${providerName}_model`) || DEFAULT_MODELS[providerName];

    // Resolve base URL from settings
    const baseUrl = getSetting(`${providerName}_base_url`) || undefined;

    reqLogger.info("Generating image", {
      provider: providerName,
      model: resolvedModel,
      userId: userId || "anonymous",
    });

    const record = addRecord({
      api_key_id: getKeyIdByProviderAndKey(providerName, apiKey),
      provider: providerName,
      model: resolvedModel,
      prompt,
      parameters: JSON.stringify({ ar, quality, size, n }),
      status: "pending",
    });

    const generateStartTime = Date.now();

    try {
      const provider = createProvider(providerName, { baseUrl });

      // Apply timeout to image generation
      const imageBuffer = await withTimeout(
        provider.generateImage(prompt, resolvedModel, apiKey, { aspectRatio: ar, quality, n, size }),
        TIMEOUT_CONFIG.IMAGE_GENERATION,
        `Image generation timed out after ${TIMEOUT_CONFIG.IMAGE_GENERATION}ms`
      );

      const durationMs = Date.now() - generateStartTime;

      // Log successful generation
      reqLogger.imageGeneration(providerName, resolvedModel, true, durationMs, {
        userId: userId || "anonymous",
      });

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

          reqLogger.info("Image saved to local storage", {
            localPath: savedImage.localPath,
          });

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
                reqLogger.error("Failed to add to sync queue", syncError as Error);
              });
            }
          }
        } catch (saveError) {
          reqLogger.error("Failed to save image to local storage", saveError as Error);
          // Don't fail the request if saving fails
        }
      }

      // Log request completion
      reqLogger.requestEnd(requestId, "POST", "/api/generate", 200, Date.now() - startTime, {
        provider: providerName,
        model: resolvedModel,
      });

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
      const durationMs = Date.now() - generateStartTime;

      // Log failed generation
      reqLogger.imageGeneration(providerName, resolvedModel, false, durationMs, {
        userId: userId || "anonymous",
        error: (error as Error).message,
      });

      updateRecord(record.id, {
        status: "failed",
        error_message: (error as Error).message,
        duration_ms: durationMs,
      });

      // Handle timeout errors specifically
      if (error instanceof TimeoutError) {
        reqLogger.warn("Image generation timed out", {
          provider: providerName,
          model: resolvedModel,
          timeout: TIMEOUT_CONFIG.IMAGE_GENERATION,
        });
        reqLogger.requestEnd(requestId, "POST", "/api/generate", 408, Date.now() - startTime);
        return createTimeoutResponse("图片生成");
      }

      // Return sanitized error message
      reqLogger.requestEnd(requestId, "POST", "/api/generate", 500, Date.now() - startTime);

      return NextResponse.json(
        { error: { code: "GENERATION_FAILED", message: "图片生成失败，请重试" } },
        { status: 500 }
      );
    }
  } catch (error) {
    reqLogger.error("Unexpected error in generate API", error as Error);
    reqLogger.requestEnd(requestId, "POST", "/api/generate", 500, Date.now() - startTime);
    return createErrorResponse(error, "GenerateAPI");
  }
}
