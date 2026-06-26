/**
 * MiniMax image generation provider.
 *
 * Uses the MiniMax API with /v1/image_generation endpoint.
 */

import { BaseProvider, parseAspectRatio, sizeFromAspectRatio } from "./base";
import type { ImageRequest } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
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

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class MiniMaxProvider extends BaseProvider {
  readonly name: Provider = "minimax";
  readonly defaultModel = "image-01";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://api.minimaxi.com");
  }

  protected getImageUrl(): string {
    // Ensure proper path handling
    let baseUrl = this.baseUrl;
    if (!baseUrl.endsWith("/v1")) {
      baseUrl = `${baseUrl}/v1`;
    }
    return `${baseUrl}/image_generation`;
  }

  protected buildRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): ImageRequest {
    const resolvedModel = model || this.defaultModel;
    const aspectRatio = this.resolveAspectRatio(options);

    return {
      model: resolvedModel,
      prompt,
      n: options.n,
      // Store aspect_ratio in extra fields
      aspect_ratio: aspectRatio,
    } as ImageRequest;
  }

  private resolveAspectRatio(options: GenerateImageOptions): string {
    if (options.size) {
      const parsed = parseAspectRatio(options.size);
      if (!parsed) {
        throw new ProviderError(this.name, undefined, "Size must be in WxH format, for example 1024x1024.");
      }
      if (parsed.width % 8 !== 0 || parsed.height % 8 !== 0) {
        throw new ProviderError(this.name, undefined, "Width and height must both be multiples of 8.");
      }
      if (parsed.width < 512 || parsed.width > 2048 || parsed.height < 512 || parsed.height > 2048) {
        throw new ProviderError(this.name, undefined, "Width and height must be between 512 and 2048.");
      }
      // Convert to aspect ratio
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(parsed.width, parsed.height);
      return `${parsed.width / g}:${parsed.height / g}`;
    }

    return options.aspectRatio ?? "1:1";
  }

  /**
   * Override to handle MiniMax's specific request and response format.
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

    const url = this.getImageUrl();
    const body = this.buildMiniMaxRequestBody(prompt, model, options);
    const headers = this.getHeaders(apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `MiniMax API error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as MiniMaxResponse;
    return this.extractFromMiniMaxResponse(result);
  }

  private buildMiniMaxRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): Record<string, unknown> {
    const resolvedModel = model || this.defaultModel;
    const aspectRatio = this.resolveAspectRatio(options);

    const body: Record<string, unknown> = {
      model: resolvedModel,
      prompt,
      response_format: "base64",
      aspect_ratio: aspectRatio,
    };

    if (options.n && options.n > 1) {
      body.n = options.n;
    }

    return body;
  }

  private async extractFromMiniMaxResponse(response: MiniMaxResponse): Promise<Buffer> {
    // Check for error
    if (response.base_resp?.status_code !== 0 && response.base_resp?.status_code !== undefined) {
      throw new ProviderError(
        this.name,
        undefined,
        `MiniMax error: ${response.base_resp.status_msg}`,
      );
    }

    // Try base64 first
    const base64Image = response.data?.image_base64?.[0];
    if (base64Image) {
      return Buffer.from(base64Image, "base64");
    }

    // Try URL
    const url = response.data?.image_urls?.[0];
    if (url) {
      const imageResponse = await fetch(url);
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

    throw new ProviderError(this.name, undefined, "No image in MiniMax response");
  }
}

export default MiniMaxProvider;
