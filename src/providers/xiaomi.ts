/**
 * Xiaomi (小米) image generation provider.
 *
 * Xiaomi uses an OpenAI-compatible /images/generations endpoint.
 * This provider supports aspect ratio, pixel size, and quality options
 * similar to OpenAI's image API.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
  OpenAIImageApiResponse,
} from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://api.xiaomi.com/v1";
const DEFAULT_MODEL = "xiaomi-image";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAspectRatio(ar: string): { width: number; height: number } | null {
  const match = ar.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const w = parseFloat(match[1]!);
  const h = parseFloat(match[2]!);
  if (w <= 0 || h <= 0) return null;
  return { width: w, height: h };
}

function parsePixelSize(value: string): { width: number; height: number } | null {
  const match = value.match(/^(\d+)\s*[xX]\s*(\d+)$/);
  if (!match) return null;
  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function roundToMultiple(value: number, multiple: number): number {
  return Math.max(multiple, Math.round(value / multiple) * multiple);
}

/**
 * Build a pixel size string from an aspect ratio and quality setting.
 * Produces dimensions suitable for OpenAI-compatible APIs (multiples of 16, min 655,360px).
 */
function buildSizeFromAspectRatio(ar: string | null, quality: "normal" | "2k"): string {
  const parsed = ar ? parseAspectRatio(ar) : null;
  const ratio = parsed ? parsed.width / parsed.height : 1;

  if (!parsed || (parsed.width === parsed.height)) {
    const edge = quality === "2k" ? 2048 : 1024;
    return `${edge}x${edge}`;
  }

  const targetLongEdge = quality === "2k" ? 2048 : 1024;
  let width: number;
  let height: number;

  if (ratio > 1) {
    width = targetLongEdge;
    height = roundToMultiple(width / ratio, 16);
  } else {
    height = targetLongEdge;
    width = roundToMultiple(height * ratio, 16);
  }

  // Ensure minimum total pixel count
  while (width * height < 655_360) {
    if (ratio > 1) {
      width += 16;
      height = roundToMultiple(width / ratio, 16);
    } else {
      height += 16;
      width = roundToMultiple(height * ratio, 16);
    }
  }

  return `${width}x${height}`;
}

function resolveSize(options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">): string {
  // If explicit pixel size is provided, use it directly
  if (options.size) {
    const parsed = parsePixelSize(options.size);
    if (!parsed) {
      throw new Error("Size must be in WxH format, for example 1280x1280.");
    }
    if (parsed.width % 16 !== 0 || parsed.height % 16 !== 0) {
      throw new Error("Width and height must both be multiples of 16.");
    }
    if (parsed.width * parsed.height < 655_360) {
      throw new Error("Image must be at least 655,360 pixels (e.g. 816x816).");
    }
    return `${parsed.width}x${parsed.height}`;
  }

  return buildSizeFromAspectRatio(options.aspectRatio ?? null, options.quality ?? "2k");
}

function resolveQuality(model: string, quality: "normal" | "2k"): "standard" | "hd" | "medium" | "high" | undefined {
  // gpt-image family models use medium/high
  if (model.includes("gpt-image")) {
    return quality === "2k" ? "high" : "medium";
  }
  // dall-e-3 uses standard/hd
  if (model.includes("dall-e-3")) {
    return quality === "2k" ? "hd" : "standard";
  }
  // For Xiaomi-native or generic models, omit quality field
  return undefined;
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

async function extractImageFromResponse(result: OpenAIImageApiResponse): Promise<Buffer> {
  const img = result.data?.[0];

  if (img?.b64_json) {
    return Buffer.from(img.b64_json, "base64");
  }

  if (img?.url) {
    const imgRes = await fetch(img.url);
    if (!imgRes.ok) {
      throw new Error(`Failed to download image: ${imgRes.status}`);
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("No image in response");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class XiaomiProvider implements ImageProvider {
  readonly name = "xiaomi" as const;
  readonly defaultModel: string;

  private readonly baseUrl: string;

  constructor(options?: { baseUrl?: string; defaultModel?: string }) {
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/g, "");
    this.defaultModel = options?.defaultModel ?? DEFAULT_MODEL;
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("xiaomi", undefined, "API key is required for Xiaomi provider.");
    }

    const resolvedModel = model || this.defaultModel;
    const size = resolveSize(options);
    const quality = resolveQuality(resolvedModel, options.quality ?? "2k");

    const body: Record<string, unknown> = {
      model: resolvedModel,
      prompt,
      size,
    };

    if (quality !== undefined) {
      body.quality = quality;
    }

    if (options.n && options.n > 1) {
      body.n = options.n;
    }

    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError("xiaomi", response.status, `Xiaomi API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as OpenAIImageApiResponse;
    return extractImageFromResponse(result);
  }
}

export default XiaomiProvider;
