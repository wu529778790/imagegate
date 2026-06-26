/**
 * MiniMax image generation provider.
 *
 * Uses the MiniMax API with /v1/image_generation endpoint.
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

function resolveAspectRatio(options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">): string {
  if (options.size) {
    const parsed = parsePixelSize(options.size);
    if (!parsed) {
      throw new Error("Size must be in WxH format, for example 1024x1024.");
    }
    if (parsed.width % 8 !== 0 || parsed.height % 8 !== 0) {
      throw new Error("Width and height must both be multiples of 8.");
    }
    if (parsed.width < 512 || parsed.width > 2048 || parsed.height < 512 || parsed.height > 2048) {
      throw new Error("Width and height must be between 512 and 2048.");
    }
    // Convert to aspect ratio
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(parsed.width, parsed.height);
    return `${parsed.width / g}:${parsed.height / g}`;
  }

  return options.aspectRatio ?? "1:1";
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface MiniMaxResponse {
  data?: {
    image_urls?: string[];
    image_base64?: string[];
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

async function extractImageFromResponse(result: MiniMaxResponse): Promise<Buffer> {
  if (result.base_resp?.status_code !== 0 && result.base_resp?.status_code !== undefined) {
    throw new Error(`MiniMax error: ${result.base_resp.status_msg}`);
  }

  // Try base64 first
  const base64Image = result.data?.image_base64?.[0];
  if (base64Image) {
    return Buffer.from(base64Image, "base64");
  }

  // Try URL
  const url = result.data?.image_urls?.[0];
  if (url) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("No image in MiniMax response");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class MiniMaxProvider implements ImageProvider {
  readonly name = "minimax" as const;
  readonly defaultModel = "image-01";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // MiniMax base URL: https://api.minimaxi.com
    // The API endpoint will be: /v1/image_generation
    this.baseUrl = (baseUrl ?? "https://api.minimaxi.com")
      .replace(/\/+$/g, "");
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("minimax", undefined, "API key is required for MiniMax provider.");
    }

    const resolvedModel = model || this.defaultModel;
    const aspectRatio = resolveAspectRatio(options);

    // Build URL with proper path handling
    let baseUrl = this.baseUrl;
    if (!baseUrl.endsWith("/v1")) {
      baseUrl = `${baseUrl}/v1`;
    }
    const url = `${baseUrl}/image_generation`;

    const body: Record<string, unknown> = {
      model: resolvedModel,
      prompt,
      response_format: "base64",
      aspect_ratio: aspectRatio,
    };

    if (options.n && options.n > 1) {
      body.n = options.n;
    }

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
      throw new ProviderError("minimax", response.status, `MiniMax API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as MiniMaxResponse;
    return extractImageFromResponse(result);
  }
}

export default MiniMaxProvider;
