/**
 * Anthropic image generation provider.
 *
 * Uses Anthropic Messages API to generate images via Claude models
 * that support image generation (e.g., claude-sonnet with image output).
 *
 * Fill in base URL + model + API key.
 */

import { BaseProvider, sizeFromAspectRatio } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

interface AnthropicResponse {
  content: Array<{
    type: string;
    text?: string;
    source?: {
      type: string;
      media_type: string;
      data: string;
    };
  }>;
}

export class AnthropicProvider extends BaseProvider {
  readonly name: Provider = "anthropic";
  readonly defaultModel: string;

  constructor(baseUrl?: string, defaultModel?: string) {
    super(baseUrl ?? "https://api.anthropic.com");
    this.defaultModel = defaultModel ?? "claude-sonnet-4-20250514";
  }

  protected getImageUrl(): string {
    return `${this.baseUrl}/v1/messages`;
  }

  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

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
    const size = this.resolveSize(options);

    const body = {
      model: resolvedModel,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Generate an image: ${prompt}${size ? ` (${size})` : ""}`,
        },
      ],
    };

    const response = await this.makeRequest<AnthropicResponse>(this.getImageUrl(), {
      method: "POST",
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(body),
    });

    for (const block of response.content) {
      if (block.type === "image" && block.source?.data) {
        return Buffer.from(block.source.data, "base64");
      }
      if (block.type === "text" && block.text) {
        const base64Match = block.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
        if (base64Match) {
          return Buffer.from(base64Match[1], "base64");
        }
      }
    }
    throw new ProviderError(this.name, undefined, "No image data in Anthropic response");
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
}
