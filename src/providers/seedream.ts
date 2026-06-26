/**
 * Seedream (豆包) image generation provider.
 *
 * Uses the Volcengine ARK API with /images/generations endpoint.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
} from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePixelSize(value: string): { width: number; height: number } | null {
  const match = value.trim().match(/^(\d+)\s*[xX*]\s*(\d+)$/);
  if (!match) return null;
  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function normalizeSize(value: string): string | null {
  // Check for preset sizes
  const upper = value.trim().toUpperCase();
  if (upper === "1K" || upper === "2K" || upper === "3K" || upper === "4K") {
    return upper;
  }

  // Check for pixel size
  const parsed = parsePixelSize(value);
  if (parsed) {
    return `${parsed.width}x${parsed.height}`;
  }

  return null;
}

function resolveSize(model: string, options: Pick<GenerateImageOptions, "size" | "quality">): string {
  if (options.size) {
    const normalized = normalizeSize(options.size);
    if (normalized) return normalized;
    throw new Error("Invalid size format. Use WxH (e.g., 1024x1024) or preset (1K, 2K, 3K, 4K).");
  }

  // Default size based on model family
  if (model.includes("seedream-5")) return "2K";
  if (model.includes("seedream-4.5")) return "2K";
  if (model.includes("seedream-4.0")) return options.quality === "normal" ? "1K" : "2K";
  if (model.includes("seedream-3.0")) return options.quality === "2k" ? "2048x2048" : "1024x1024";

  return "2K";
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface SeedreamImageResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    error?: {
      code?: string;
      message?: string;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
  };
}

async function downloadImage(url: string): Promise<Buffer> {
  const imgResponse = await fetch(url);
  if (!imgResponse.ok) {
    throw new Error(`Failed to download image from ${url}`);
  }
  const arrayBuffer = await imgResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractImageFromResponse(result: SeedreamImageResponse): Promise<Buffer> {
  if (result.error) {
    throw new Error(result.error.message || "Seedream API returned an error");
  }

  const first = result.data?.find((item) => item.url || item.b64_json || item.error);

  if (!first) {
    throw new Error("No image data in Seedream response");
  }

  if (first.error) {
    throw new Error(first.error.message || "Seedream returned an image generation error");
  }

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }

  if (first.url) {
    return downloadImage(first.url);
  }

  throw new Error("No image URL or base64 data in Seedream response");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class SeedreamProvider implements ImageProvider {
  readonly name = "seedream" as const;
  readonly defaultModel = "doubao-seedream-5-0-260128";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // Seedream base URL: https://ark.cn-beijing.volces.com/api/v3
    this.baseUrl = (baseUrl ?? "https://ark.cn-beijing.volces.com/api/v3")
      .replace(/\/+$/g, "");
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("seedream", undefined, "API key is required for Seedream provider.");
    }

    const resolvedModel = model || this.defaultModel;
    const size = resolveSize(resolvedModel, options);

    const url = `${this.baseUrl}/images/generations`;

    const body: Record<string, unknown> = {
      model: resolvedModel,
      prompt,
      size,
      response_format: "url",
      watermark: false,
    };

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
      throw new ProviderError("seedream", response.status, `Seedream API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as SeedreamImageResponse;
    return extractImageFromResponse(result);
  }
}

export default SeedreamProvider;
