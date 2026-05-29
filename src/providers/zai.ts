/**
 * Z.AI (智谱) image generation provider.
 *
 * Uses the Z.AI /api/paas/v4/images/generations endpoint.
 * Supports the CogView model family (cogview-3, cogview-3-plus) with various aspect ratios and quality presets.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
  Quality,
  ZaiApiResponse,
} from "./types";
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
// Helpers
// ---------------------------------------------------------------------------

function getModelFamily(model: string): ZaiModelFamily {
  const m = model.trim().toLowerCase();
  return m === "glm-image" || m === "cogview-3" || m === "cogview-3-plus" ? "glm" : "legacy";
}

function parseAspectRatio(ar: string): { width: number; height: number } | null {
  const match = ar.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function parseSize(size: string): { width: number; height: number } | null {
  const match = size.trim().match(/^(\d+)\s*[xX*]\s*(\d+)$/);
  if (!match) return null;
  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function formatSize(width: number, height: number): string {
  return `${width}x${height}`;
}

function roundToStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function getRatioValue(ar: string): number | null {
  const parsed = parseAspectRatio(ar);
  if (!parsed) return null;
  return parsed.width / parsed.height;
}

function findClosestRatioKey(ar: string, candidates: string[]): string | null {
  const targetRatio = getRatioValue(ar);
  if (targetRatio == null) return null;

  let bestKey: string | null = null;
  let bestDiff = Infinity;
  for (const candidate of candidates) {
    const candidateRatio = getRatioValue(candidate);
    if (candidateRatio == null) continue;
    const diff = Math.abs(candidateRatio - targetRatio);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestKey = candidate;
    }
  }

  return bestDiff <= 0.05 ? bestKey : null;
}

function getTargetPixels(quality: Quality): number {
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

  let roundedWidth = roundToStep(nextWidth, step);
  let roundedHeight = roundToStep(nextHeight, step);
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
  const parsed = parseSize(size);
  if (!parsed) {
    throw new Error("Z.AI --size must be in WxH format, for example 1280x1280.");
  }

  const widthStep = family === "glm" ? GLM_SIZE_STEP : LEGACY_SIZE_STEP;
  const minEdge = family === "glm" ? 1024 : 512;
  const maxPixels = family === "glm" ? GLM_MAX_PIXELS : LEGACY_MAX_PIXELS;

  if (parsed.width < minEdge || parsed.width > 2048 || parsed.height < minEdge || parsed.height > 2048) {
    throw new Error(
      family === "glm"
        ? "GLM-image custom size requires width and height between 1024 and 2048."
        : "Z.AI legacy image models require width and height between 512 and 2048.",
    );
  }

  if (parsed.width % widthStep !== 0 || parsed.height % widthStep !== 0) {
    throw new Error(
      family === "glm"
        ? "GLM-image custom size requires width and height divisible by 32."
        : "Z.AI legacy image models require width and height divisible by 16.",
    );
  }

  if (parsed.width * parsed.height > maxPixels) {
    throw new Error(
      family === "glm"
        ? "GLM-image custom size must not exceed 2^22 total pixels."
        : "Z.AI legacy image size must not exceed 2^21 total pixels.",
    );
  }

  return formatSize(parsed.width, parsed.height);
}

function resolveSize(
  model: string,
  options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">,
): string {
  const family = getModelFamily(model);
  const quality = options.quality === "normal" ? "normal" : "2k";

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
  return formatSize(fit.width, fit.height);
}

function getZaiQuality(quality: Quality): "hd" | "standard" {
  return quality === "normal" ? "standard" : "hd";
}

function buildRequestBody(prompt: string, model: string, options: GenerateImageOptions) {
  if ((options.n ?? 1) > 1) {
    throw new Error("Z.AI image generation currently returns a single image per request.");
  }

  return {
    model,
    prompt,
    quality: getZaiQuality(options.quality ?? "2k"),
    size: resolveSize(model, options),
  };
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

async function extractImageFromResponse(result: ZaiApiResponse): Promise<Buffer> {
  const url = result.data?.[0]?.url;
  if (!url) {
    throw new Error("No image URL in Z.AI response");
  }

  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image from Z.AI: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class ZaiProvider implements ImageProvider {
  readonly name = "zai" as const;
  readonly defaultModel = "cogview-3";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? "https://open.bigmodel.cn/api/paas/v4")
      .replace(/\/+$/g, "");
  }

  private buildUrl(): string {
    const base = this.baseUrl;
    if (base.endsWith("/images/generations")) return base;
    if (base.endsWith("/api/paas/v4")) return `${base}/images/generations`;
    if (base.endsWith("/v4")) return `${base}/images/generations`;
    return `${base}/api/paas/v4/images/generations`;
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("zai", undefined, "API key is required for Z.AI provider.");
    }

    const url = this.buildUrl();
    const body = buildRequestBody(prompt, model, options);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError("zai", response.status, `Z.AI API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as ZaiApiResponse;
    return extractImageFromResponse(result);
  }
}

export default ZaiProvider;
