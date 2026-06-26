/**
 * Seedream (豆包) image generation provider.
 *
 * Uses the Volcengine ARK API with /images/generations endpoint.
 */

import { BaseProvider, parseAspectRatio } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
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

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class SeedreamProvider extends BaseProvider {
  readonly name: Provider = "seedream";
  readonly defaultModel = "doubao-seedream-5-0-260128";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://ark.cn-beijing.volces.com/api/v3");
  }

  /**
   * Override to handle Seedream's specific request format.
   */
  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError(this.name, undefined, "API key is required");
    }

    const resolvedModel = model || this.defaultModel;
    const size = this.resolveSize(resolvedModel, options);

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
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `Seedream API error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as SeedreamImageResponse;
    return this.extractFromSeedreamResponse(result);
  }

  private resolveSize(model: string, options: GenerateImageOptions): string {
    if (options.size) {
      const normalized = this.normalizeSize(options.size);
      if (normalized) return normalized;
      throw new ProviderError(
        this.name,
        undefined,
        "Invalid size format. Use WxH (e.g., 1024x1024) or preset (1K, 2K, 3K, 4K).",
      );
    }

    // Default size based on model family
    if (model.includes("seedream-5")) return "2K";
    if (model.includes("seedream-4.5")) return "2K";
    if (model.includes("seedream-4.0")) return options.quality === "normal" ? "1K" : "2K";
    if (model.includes("seedream-3.0")) return options.quality === "2k" ? "2048x2048" : "1024x1024";

    return "2K";
  }

  private normalizeSize(value: string): string | null {
    // Check for preset sizes
    const upper = value.trim().toUpperCase();
    if (upper === "1K" || upper === "2K" || upper === "3K" || upper === "4K") {
      return upper;
    }

    // Check for pixel size
    const parsed = parseAspectRatio(value);
    if (parsed) {
      return `${parsed.width}x${parsed.height}`;
    }

    return null;
  }

  private async extractFromSeedreamResponse(response: SeedreamImageResponse): Promise<Buffer> {
    if (response.error) {
      throw new ProviderError(
        this.name,
        undefined,
        response.error.message || "Seedream API returned an error",
      );
    }

    const first = response.data?.find((item) => item.url || item.b64_json || item.error);

    if (!first) {
      throw new ProviderError(this.name, undefined, "No image data in Seedream response");
    }

    if (first.error) {
      throw new ProviderError(
        this.name,
        undefined,
        first.error.message || "Seedream returned an image generation error",
      );
    }

    if (first.b64_json) {
      return Buffer.from(first.b64_json, "base64");
    }

    if (first.url) {
      const imageResponse = await fetch(first.url);
      if (!imageResponse.ok) {
        throw new ProviderError(
          this.name,
          imageResponse.status,
          `Failed to download image: ${imageResponse.status}`,
        );
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new ProviderError(this.name, undefined, "No image URL or base64 data in Seedream response");
  }
}

export default SeedreamProvider;
