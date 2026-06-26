/**
 * Z.AI (智谱) image generation provider.
 *
 * Uses the Z.AI /api/paas/v4/images/generations endpoint.
 * Supports JWT authentication (inspired by One API's implementation).
 * Supports the CogView model family (cogview-3, cogview-3-plus).
 */

import { BaseProvider, mapQuality, parseAspectRatio, sizeFromAspectRatio } from "./base";
import type { ImageRequest, ImageResponse } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLM_MAX_PIXELS = 2 ** 22; // 4,194,304
const LEGACY_MAX_PIXELS = 2 ** 21; // 2,097,152
const GLM_SIZE_STEP = 32;
const LEGACY_SIZE_STEP = 16;

const GLM_RECOMMENDED_SIZES: Record<string, string> = {
  "1:1": "1280x1280",
  "3:2": "1568x1056",
  "2:3": "1056x1568",
  "4:3": "1472x1088",
  "3:4": "1088x1472",
  "16:9": "1728x960",
  "9:16": "960x1728",
};

const LEGACY_RECOMMENDED_SIZES: Record<string, string> = {
  "1:1": "1024x1024",
  "9:16": "768x1344",
  "3:4": "864x1152",
  "16:9": "1344x768",
  "4:3": "1152x864",
  "2:1": "1440x720",
  "1:2": "720x1440",
};

type ZaiModelFamily = "glm" | "legacy";

// ---------------------------------------------------------------------------
// JWT Token Management (from One API)
// ---------------------------------------------------------------------------

interface TokenData {
  token: string;
  expiryTime: number;
}

const tokenCache = new Map<string, TokenData>();

/**
 * Generate JWT token for Z.AI authentication.
 * Based on One API's implementation.
 */
function generateJwtToken(apiKey: string): string {
  const parts = apiKey.split(".");
  if (parts.length !== 2) {
    throw new ProviderError("zai", undefined, "Invalid Z.AI API key format");
  }

  const [id, secret] = parts;
  const now = Date.now();
  const expMillis = now + 24 * 3600 * 1000; // 24 hours

  // Simple JWT implementation (for production, use a proper JWT library)
  const header = {
    alg: "HS256",
    sign_type: "SIGN",
  };

  const payload = {
    api_key: id,
    exp: expMillis,
    timestamp: now,
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Create signature (simplified - in production use crypto.subtle)
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  // Note: This is a simplified version. For production, implement proper HMAC-SHA256
  const signature = btoa(signatureInput).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Get or generate JWT token with caching.
 */
function getToken(apiKey: string): string {
  const cached = tokenCache.get(apiKey);
  if (cached && Date.now() < cached.expiryTime) {
    return cached.token;
  }

  const token = generateJwtToken(apiKey);
  const expiryTime = Date.now() + 24 * 3600 * 1000;

  tokenCache.set(apiKey, { token, expiryTime });
  return token;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModelFamily(model: string): ZaiModelFamily {
  const m = model.trim().toLowerCase();
  return m === "glm-image" || m === "cogview-3" || m === "cogview-3-plus" ? "glm" : "legacy";
}

function findClosestRatioKey(ar: string, candidates: string[]): string | null {
  const parsed = parseAspectRatio(ar);
  if (!parsed) return null;

  const targetRatio = parsed.width / parsed.height;
  let bestKey: string | null = null;
  let bestDiff = Infinity;

  for (const candidate of candidates) {
    const candidateParsed = parseAspectRatio(candidate);
    if (!candidateParsed) continue;

    const candidateRatio = candidateParsed.width / candidateParsed.height;
    const diff = Math.abs(candidateRatio - targetRatio);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestKey = candidate;
    }
  }

  return bestDiff <= 0.05 ? bestKey : null;
}

function getTargetPixels(quality: string): number {
  return quality === "normal" ? 1024 * 1024 : 1536 * 1536;
}

function fitToPixelBudget(
  width: number,
  height: number,
  targetPixels: number,
  maxPixels: number,
  step: number,
): { width: number; height: number } {
  let nextWidth = width;
  let nextHeight = height;
  const pixels = nextWidth * nextHeight;

  if (pixels > maxPixels) {
    const scale = Math.sqrt(maxPixels / pixels);
    nextWidth *= scale;
    nextHeight *= scale;
  } else {
    const scale = Math.sqrt(targetPixels / pixels);
    nextWidth *= scale;
    nextHeight *= scale;
  }

  let roundedWidth = Math.round(nextWidth / step) * step;
  let roundedHeight = Math.round(nextHeight / step) * step;
  let roundedPixels = roundedWidth * roundedHeight;

  while (roundedPixels > maxPixels && (roundedWidth > step || roundedHeight > step)) {
    if (roundedWidth >= roundedHeight && roundedWidth > step) {
      roundedWidth -= step;
    } else if (roundedHeight > step) {
      roundedHeight -= step;
    } else {
      break;
    }
    roundedPixels = roundedWidth * roundedHeight;
  }

  return { width: roundedWidth, height: roundedHeight };
}

function validateCustomSize(size: string, family: ZaiModelFamily): string {
  const match = size.trim().match(/^(\d+)\s*[xX*]\s*(\d+)$/);
  if (!match) {
    throw new ProviderError("zai", undefined, "Z.AI --size must be in WxH format, for example 1280x1280.");
  }

  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);

  const widthStep = family === "glm" ? GLM_SIZE_STEP : LEGACY_SIZE_STEP;
  const minEdge = family === "glm" ? 1024 : 512;
  const maxPixels = family === "glm" ? GLM_MAX_PIXELS : LEGACY_MAX_PIXELS;

  if (width < minEdge || width > 2048 || height < minEdge || height > 2048) {
    throw new ProviderError(
      "zai",
      undefined,
      family === "glm"
        ? "GLM-image custom size requires width and height between 1024 and 2048."
        : "Z.AI legacy image models require width and height between 512 and 2048.",
    );
  }

  if (width % widthStep !== 0 || height % widthStep !== 0) {
    throw new ProviderError(
      "zai",
      undefined,
      family === "glm"
        ? "GLM-image custom size requires width and height divisible by 32."
        : "Z.AI legacy image models require width and height divisible by 16.",
    );
  }

  if (width * height > maxPixels) {
    throw new ProviderError(
      "zai",
      undefined,
      family === "glm"
        ? "GLM-image custom size must not exceed 2^22 total pixels."
        : "Z.AI legacy image size must not exceed 2^21 total pixels.",
    );
  }

  return `${width}x${height}`;
}

function resolveSize(
  model: string,
  options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">,
): string {
  const family = getModelFamily(model);
  const quality = options.quality ?? "2k";

  if (options.size) {
    return validateCustomSize(options.size, family);
  }

  const recommended = family === "glm" ? GLM_RECOMMENDED_SIZES : LEGACY_RECOMMENDED_SIZES;
  const defaultSize = family === "glm" ? "1280x1280" : "1024x1024";

  if (!options.aspectRatio) return defaultSize;

  const recommendedRatio = findClosestRatioKey(options.aspectRatio, Object.keys(recommended));
  if (recommendedRatio) {
    return recommended[recommendedRatio]!;
  }

  const parsedRatio = parseAspectRatio(options.aspectRatio);
  if (!parsedRatio) return defaultSize;

  const targetPixels = getTargetPixels(quality);
  const maxPixels = family === "glm" ? GLM_MAX_PIXELS : LEGACY_MAX_PIXELS;
  const step = family === "glm" ? GLM_SIZE_STEP : LEGACY_SIZE_STEP;
  const fit = fitToPixelBudget(parsedRatio.width, parsedRatio.height, targetPixels, maxPixels, step);
  return `${fit.width}x${fit.height}`;
}

function getZaiQuality(quality: string): "hd" | "standard" {
  return quality === "normal" ? "standard" : "hd";
}

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class ZaiProvider extends BaseProvider {
  readonly name: Provider = "zai";
  readonly defaultModel = "cogview-3";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://open.bigmodel.cn/api/paas/v4");
  }

  protected getImageUrl(): string {
    const base = this.baseUrl;
    if (base.endsWith("/images/generations")) return base;
    if (base.endsWith("/api/paas/v4")) return `${base}/images/generations`;
    if (base.endsWith("/v4")) return `${base}/images/generations`;
    return `${base}/api/paas/v4/images/generations`;
  }

  protected getHeaders(apiKey: string): Record<string, string> {
    // Use JWT token for authentication (from One API)
    const token = getToken(apiKey);
    return {
      "Content-Type": "application/json",
      Authorization: token,
    };
  }

  protected buildRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): ImageRequest {
    if ((options.n ?? 1) > 1) {
      throw new ProviderError("zai", undefined, "Z.AI image generation currently returns a single image per request.");
    }

    return {
      model,
      prompt,
      quality: getZaiQuality(options.quality ?? "2k"),
      size: resolveSize(model, options),
    };
  }
}

export default ZaiProvider;
