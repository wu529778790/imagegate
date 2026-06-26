/**
 * Azure OpenAI image generation provider.
 *
 * Uses the Azure OpenAI API with /openai/deployments/{deployment}/images/generations endpoint.
 */

import { BaseProvider, parseAspectRatio, sizeFromAspectRatio } from "./base";
import type { ImageRequest } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AzureImageRequest {
  prompt: string;
  size?: string;
  quality?: string;
  n?: number;
}

interface AzureImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Provider Configuration
// ---------------------------------------------------------------------------

export interface AzureConfig {
  baseUrl: string;
  deployment: string;
  apiVersion?: string;
}

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class AzureProvider extends BaseProvider {
  readonly name: Provider = "azure";
  readonly defaultModel = "gpt-image-2";

  private readonly deployment: string;
  private readonly apiVersion: string;

  constructor(config?: Partial<AzureConfig>) {
    super(config?.baseUrl ?? "https://your-resource.openai.azure.com");
    this.deployment = config?.deployment ?? "gpt-image-2";
    this.apiVersion = config?.apiVersion ?? "2025-04-01-preview";
  }

  private buildURL(deployment: string, pathSuffix: string): string {
    // Parse base URL to extract resource base URL
    let resourceBaseURL = this.baseUrl;
    if (!resourceBaseURL.endsWith("/openai")) {
      resourceBaseURL = `${resourceBaseURL}/openai`;
    }
    return `${resourceBaseURL}/deployments/${encodeURIComponent(deployment)}${pathSuffix}?api-version=${this.apiVersion}`;
  }

  /**
   * Override to use Azure-specific URL construction.
   */
  protected getImageUrl(): string {
    return this.buildURL(this.deployment, "/images/generations");
  }

  /**
   * Override to use Azure's API key header.
   */
  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "api-key": apiKey,
    };
  }

  /**
   * Override to handle Azure's specific request format.
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

    const deployment = model || this.deployment;
    const url = this.buildURL(deployment, "/images/generations");
    const size = this.resolveSize(options);
    const quality = this.resolveQuality(options.quality);

    const body: AzureImageRequest = {
      prompt,
      size,
      n: 1,
      quality,
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
        `Azure OpenAI API error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as AzureImageResponse;
    return this.extractFromAzureResponse(result);
  }

  private resolveSize(options: GenerateImageOptions): string {
    if (options.size) {
      const normalized = options.size.replace(/[xX*]/g, "x");
      const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
      if (validSizes.includes(normalized)) {
        return normalized;
      }
    }

    if (options.aspectRatio) {
      const size = sizeFromAspectRatio(options.aspectRatio, 1024 * 1024, 64);
      if (size) {
        const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
        if (validSizes.includes(size)) {
          return size;
        }
      }
    }

    return "1024x1024";
  }

  private resolveQuality(quality?: string): string {
    if (!quality) return "hd";
    if (quality === "normal") return "standard";
    if (quality === "2k" || quality === "high") return "hd";
    return quality;
  }

  private async extractFromAzureResponse(response: AzureImageResponse): Promise<Buffer> {
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new ProviderError(this.name, undefined, "No image data in Azure response");
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

    throw new ProviderError(this.name, undefined, "No image URL or base64 data in Azure response");
  }
}

export default AzureProvider;
