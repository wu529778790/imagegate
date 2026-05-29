/**
 * Azure OpenAI image generation provider.
 *
 * Uses the Azure OpenAI API with /openai/deployments/{deployment}/images/generations endpoint.
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
  if (!ar) {
    const edge = quality === "2k" ? 2048 : 1024;
    return `${edge}x${edge}`;
  }

  const match = ar.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) {
    const edge = quality === "2k" ? 2048 : 1024;
    return `${edge}x${edge}`;
  }

  const ratio = parseFloat(match[1]!) / parseFloat(match[2]!);
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
      throw new Error("Size must be in WxH format, for example 1024x1024.");
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

export interface AzureConfig {
  baseUrl: string;
  deployment: string;
  apiVersion?: string;
}

export class AzureProvider implements ImageProvider {
  readonly name = "azure" as const;
  readonly defaultModel = "gpt-image-2";

  private readonly baseUrl: string;
  private readonly deployment: string;
  private readonly apiVersion: string;

  constructor(config?: Partial<AzureConfig>) {
    this.baseUrl = (config?.baseUrl ?? "https://your-resource.openai.azure.com")
      .replace(/\/+$/g, "");
    this.deployment = config?.deployment ?? "gpt-image-2";
    this.apiVersion = config?.apiVersion ?? "2025-04-01-preview";
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("azure", undefined, "API key is required for Azure OpenAI provider.");
    }

    const deployment = model || this.deployment;
    const size = resolveSize(options);
    const quality = resolveQuality(options.quality ?? "2k");

    const url = `${this.baseUrl}/openai/deployments/${deployment}/images/generations?api-version=${this.apiVersion}`;

    const body: Record<string, unknown> = {
      prompt,
      size,
    };

    if (quality !== undefined) {
      body.quality = quality;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError("azure", response.status, `Azure OpenAI API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as OpenAIImageApiResponse;
    return extractImageFromResponse(result);
  }
}

export default AzureProvider;
