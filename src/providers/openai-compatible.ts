/**
 * OpenAI-compatible image generation provider.
 *
 * Supports OpenAI, Azure OpenAI, OpenRouter, and other OpenAI-compatible APIs.
 * Refactored to use BaseProvider for common functionality.
 */

import { BaseProvider, parseAspectRatio, sizeFromAspectRatio } from "./base";
import type { ImageRequest } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DALL_E_3_SIZES = ["1024x1024", "1792x1024", "1024x1792"];
const DALL_E_2_SIZES = ["256x256", "512x512", "1024x1024"];

// ---------------------------------------------------------------------------
// Provider Configuration
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

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class OpenAICompatibleProvider extends BaseProvider {
  readonly name: Provider;
  readonly defaultModel: string;

  private readonly customHeaders: Record<string, string>;
  private readonly useChatEndpoint: boolean;
  private readonly extraBody: Record<string, unknown>;

  constructor(name: Provider, config: OpenAICompatibleConfig) {
    super(config.baseUrl);
    this.name = name;
    this.defaultModel = config.defaultModel;
    this.customHeaders = config.headers ?? {};
    this.useChatEndpoint = config.useChatEndpoint ?? false;
    this.extraBody = config.extraBody ?? {};
  }

  protected getImageUrl(): string {
    if (this.useChatEndpoint) {
      return `${this.baseUrl}/chat/completions`;
    }
    return `${this.baseUrl}/images/generations`;
  }

  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...this.customHeaders,
    };
  }

  protected buildRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): ImageRequest {
    const resolvedModel = model || this.defaultModel;

    // Standard OpenAI /images/generations
    const size = this.resolveSize(options);
    const quality = this.resolveQuality(options.quality);

    const body: ImageRequest = {
      model: resolvedModel,
      prompt,
      size,
      quality,
      response_format: "b64_json", // Always request base64 for consistency
      ...this.extraBody,
    };

    // DALL-E 3 only supports n=1
    if (this.isDallE3(resolvedModel)) {
      body.n = 1;
    } else if (options.n && options.n > 1) {
      body.n = options.n;
    }

    return body;
  }

  private isDallE3(model: string): boolean {
    return model.includes("dall-e-3") || model.includes("gpt-image");
  }

  private resolveSize(options: GenerateImageOptions): string {
    if (options.size) {
      const normalized = options.size.replace(/[xX*]/g, "x");
      const validSizes = this.isDallE3(this.defaultModel) ? DALL_E_3_SIZES : DALL_E_2_SIZES;

      if (validSizes.includes(normalized)) {
        return normalized;
      }
    }

    if (options.aspectRatio) {
      const targetPixels = this.isDallE3(this.defaultModel) ? 1024 * 1024 : 512 * 512;
      const size = sizeFromAspectRatio(options.aspectRatio, targetPixels, 64);
      if (size) {
        const validSizes = this.isDallE3(this.defaultModel) ? DALL_E_3_SIZES : DALL_E_2_SIZES;
        if (validSizes.includes(size)) {
          return size;
        }
      }
    }

    // Default size
    return "1024x1024";
  }

  private resolveQuality(quality?: string): string {
    if (!quality) {
      return this.isDallE3(this.defaultModel) ? "hd" : "standard";
    }

    // Map quality presets
    if (quality === "normal") return "standard";
    if (quality === "2k" || quality === "high") return "hd";

    return quality;
  }

  /**
   * Override to handle both base64 and URL responses.
   */
  protected async extractImageFromResponse(response: { data: Array<{ b64_json?: string; url?: string }> }): Promise<Buffer> {
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new ProviderError(this.name, undefined, "No image data in response");
    }

    // Handle base64 response (preferred)
    if (imageData.b64_json) {
      return Buffer.from(imageData.b64_json, "base64");
    }

    // Handle URL response (fallback)
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
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

    throw new ProviderError(this.name, undefined, "No image URL or base64 data in response");
  }
}
