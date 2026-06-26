/**
 * OpenRouter image generation provider.
 *
 * Uses the OpenRouter API with /chat/completions endpoint.
 */

import { BaseProvider } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenRouterImageEntry {
  image_url?: string | { url?: string } | null;
  imageUrl?: string | { url?: string } | null;
}

interface OpenRouterMessagePart {
  type?: string;
  text?: string;
  image_url?: string | { url?: string } | null;
  imageUrl?: { url?: string } | null;
}

interface OpenRouterResponse {
  choices?: Array<{
    finish_reason?: string | null;
    native_finish_reason?: string | null;
    message?: {
      images?: OpenRouterImageEntry[];
      content?: string | OpenRouterMessagePart[] | null;
    };
  }>;
}

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class OpenRouterProvider extends BaseProvider {
  readonly name: Provider = "openrouter";
  readonly defaultModel = "google/gemini-2.0-flash-preview-image-generation";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://openrouter.ai/api/v1");
  }

  /**
   * Override to use OpenRouter's chat completions endpoint.
   */
  protected getImageUrl(): string {
    return `${this.baseUrl}/chat/completions`;
  }

  /**
   * Override to handle OpenRouter's specific request format.
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

    const body: Record<string, unknown> = {
      model: resolvedModel,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modalities: ["image", "text"],
      stream: false,
    };

    // Add image config if aspect ratio or quality is specified
    const imageConfig: Record<string, string> = {};
    if (options.aspectRatio) {
      imageConfig.aspect_ratio = options.aspectRatio;
    }
    if (options.quality) {
      imageConfig.image_size = options.quality === "2k" ? "2K" : "1K";
    }
    if (Object.keys(imageConfig).length > 0) {
      body.image_config = imageConfig;
      body.provider = { require_parameters: true };
    }

    const response = await fetch(this.getImageUrl(), {
      method: "POST",
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `OpenRouter API error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as OpenRouterResponse;
    return this.extractFromOpenRouterResponse(result);
  }

  private async extractFromOpenRouterResponse(response: OpenRouterResponse): Promise<Buffer> {
    const choice = response.choices?.[0];
    const message = choice?.message;

    // Try to extract from images array
    for (const image of message?.images ?? []) {
      const imageUrl = this.extractImageUrl(image);
      if (imageUrl) return this.downloadImage(imageUrl);
    }

    // Try to extract from content array
    if (Array.isArray(message?.content)) {
      for (const item of message.content) {
        const imageUrl = this.extractImageUrl(item);
        if (imageUrl) return this.downloadImage(imageUrl);

        if (item.type === "text" && item.text) {
          const inline = this.decodeDataUrl(item.text);
          if (inline) return inline;
        }
      }
    } else if (typeof message?.content === "string") {
      const inline = this.decodeDataUrl(message.content);
      if (inline) return inline;
    }

    const finishReason =
      choice?.native_finish_reason || choice?.finish_reason || "unknown";
    throw new ProviderError(
      this.name,
      undefined,
      `No image in OpenRouter response (finish_reason=${finishReason})`,
    );
  }

  private extractImageUrl(entry: OpenRouterImageEntry | OpenRouterMessagePart): string | null {
    const value = "image_url" in entry ? entry.image_url : ("imageUrl" in entry ? entry.imageUrl : null);
    if (!value) return null;
    if (typeof value === "string") return value;
    return (value as { url?: string }).url ?? null;
  }

  private decodeDataUrl(value: string): Buffer | null {
    const match = value.match(/^data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return null;
    return Buffer.from(match[1]!, "base64");
  }

  private async downloadImage(value: string): Promise<Buffer> {
    const inline = this.decodeDataUrl(value);
    if (inline) return inline;

    if (value.startsWith("http://") || value.startsWith("https://")) {
      const response = await fetch(value);
      if (!response.ok) {
        throw new ProviderError(
          this.name,
          response.status,
          `Failed to download OpenRouter image: ${response.status}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return Buffer.from(value, "base64");
  }
}

export default OpenRouterProvider;
