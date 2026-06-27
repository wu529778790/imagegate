/**
 * OpenAI-compatible image generation provider.
 *
 * Supports OpenAI, 通义, 智谱, 豆包, Google, and any service
 * that implements the OpenAI /v1/images/generations API format.
 * Just fill in base URL + model + API key.
 */

import { BaseProvider, parseAspectRatio, sizeFromAspectRatio } from "./base";
import type { ImageRequest } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

export class OpenAIProvider extends BaseProvider {
  readonly name: Provider = "openai";
  readonly defaultModel: string;

  constructor(baseUrl?: string, defaultModel?: string) {
    super(baseUrl ?? "https://api.openai.com/v1");
    this.defaultModel = defaultModel ?? "gpt-image-2";
  }

  protected getImageUrl(): string {
    return `${this.baseUrl}/images/generations`;
  }

  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  protected buildRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): ImageRequest {
    const resolvedModel = model || this.defaultModel;
    const size = this.resolveSize(options);
    const quality = this.resolveQuality(options.quality);

    return {
      model: resolvedModel,
      prompt,
      size,
      quality,
      response_format: "b64_json",
      n: options.n && options.n > 1 ? options.n : 1,
    };
  }

  private resolveSize(options: GenerateImageOptions): string {
    if (options.size) {
      return options.size.replace(/[xX*]/g, "x");
    }
    if (options.aspectRatio) {
      const size = sizeFromAspectRatio(options.aspectRatio, 1024 * 1024, 64);
      if (size) return size;
    }
    return "1024x1024";
  }

  private resolveQuality(quality?: string): string {
    if (!quality || quality === "normal") return "standard";
    if (quality === "2k" || quality === "high") return "hd";
    return quality;
  }

  protected async extractImageFromResponse(response: { data: Array<{ b64_json?: string; url?: string }> }): Promise<Buffer> {
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new ProviderError(this.name, undefined, "No image data in response");
    }
    if (imageData.b64_json) {
      return Buffer.from(imageData.b64_json, "base64");
    }
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new ProviderError(this.name, imageResponse.status, `Failed to download image: ${imageResponse.status}`);
      }
      return Buffer.from(await imageResponse.arrayBuffer());
    }
    throw new ProviderError(this.name, undefined, "No image URL or base64 data in response");
  }
}
