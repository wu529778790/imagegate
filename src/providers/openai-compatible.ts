/**
 * OpenAI-compatible image generation provider.
 *
 * Supports OpenAI, Azure OpenAI, OpenRouter, and other OpenAI-compatible APIs.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
  OpenAIImageApiResponse,
  Quality,
} from "./types";
import { ProviderError } from "./types";

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

function buildSizeFromAspectRatio(ar: string | null, quality: Quality): string {
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

function resolveQuality(quality: Quality): "standard" | "hd" | undefined {
  return quality === "2k" ? "hd" : "standard";
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

export interface OpenAICompatibleConfig {
  baseUrl: string;
  defaultModel: string;
  /** Custom headers to add to the request */
  headers?: Record<string, string>;
  /** Use /chat/completions instead of /images/generations */
  useChatEndpoint?: boolean;
  /** Additional body parameters */
  extraBody?: Record<string, unknown>;
}

export class OpenAICompatibleProvider implements ImageProvider {
  readonly name: string;
  readonly defaultModel: string;

  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly useChatEndpoint: boolean;
  private readonly extraBody: Record<string, unknown>;

  constructor(name: string, config: OpenAICompatibleConfig) {
    this.name = name;
    this.baseUrl = config.baseUrl.replace(/\/+$/g, "");
    this.defaultModel = config.defaultModel;
    this.headers = config.headers ?? {};
    this.useChatEndpoint = config.useChatEndpoint ?? false;
    this.extraBody = config.extraBody ?? {};
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError(this.name, undefined, `API key is required for ${this.name} provider.`);
    }

    const resolvedModel = model || this.defaultModel;
    const size = resolveSize(options);
    const quality = resolveQuality(options.quality ?? "2k");

    let url: string;
    let body: Record<string, unknown>;

    if (this.useChatEndpoint) {
      // OpenRouter and similar use /chat/completions
      url = `${this.baseUrl}/chat/completions`;
      body = {
        model: resolvedModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        ...this.extraBody,
      };
    } else {
      // Standard OpenAI /images/generations
      url = `${this.baseUrl}/images/generations`;
      body = {
        model: resolvedModel,
        prompt,
        size,
        ...this.extraBody,
      };

      if (quality !== undefined) {
        body.quality = quality;
      }

      if (options.n && options.n > 1) {
        body.n = options.n;
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...this.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError(this.name, response.status, `${this.name} API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as OpenAIImageApiResponse;
    return extractImageFromResponse(result);
  }
}
