/**
 * OpenRouter image generation provider.
 *
 * Uses the OpenRouter API with /chat/completions endpoint.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
} from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Response handling
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

function extractImageUrl(entry: OpenRouterImageEntry | OpenRouterMessagePart): string | null {
  const value = "image_url" in entry ? entry.image_url : ("imageUrl" in entry ? entry.imageUrl : null);
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url ?? null;
}

function decodeDataUrl(value: string): Buffer | null {
  const match = value.match(/^data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return Buffer.from(match[1]!, "base64");
}

async function downloadImage(value: string): Promise<Buffer> {
  const inline = decodeDataUrl(value);
  if (inline) return inline;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(`Failed to download OpenRouter image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return Buffer.from(value, "base64");
}

async function extractImageFromResponse(result: OpenRouterResponse): Promise<Buffer> {
  const choice = result.choices?.[0];
  const message = choice?.message;

  for (const image of message?.images ?? []) {
    const imageUrl = extractImageUrl(image);
    if (imageUrl) return downloadImage(imageUrl);
  }

  if (Array.isArray(message?.content)) {
    for (const item of message.content) {
      const imageUrl = extractImageUrl(item);
      if (imageUrl) return downloadImage(imageUrl);

      if (item.type === "text" && item.text) {
        const inline = decodeDataUrl(item.text);
        if (inline) return inline;
      }
    }
  } else if (typeof message?.content === "string") {
    const inline = decodeDataUrl(message.content);
    if (inline) return inline;
  }

  const finishReason =
    choice?.native_finish_reason || choice?.finish_reason || "unknown";
  throw new Error(
    `No image in OpenRouter response (finish_reason=${finishReason})`,
  );
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class OpenRouterProvider implements ImageProvider {
  readonly name = "openrouter" as const;
  readonly defaultModel = "google/gemini-2.0-flash-preview-image-generation";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // OpenRouter base URL: https://openrouter.ai/api/v1
    this.baseUrl = (baseUrl ?? "https://openrouter.ai/api/v1")
      .replace(/\/+$/g, "");
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("openrouter", undefined, "API key is required for OpenRouter provider.");
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

    const url = `${this.baseUrl}/chat/completions`;

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
      throw new ProviderError("openrouter", response.status, `OpenRouter API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as OpenRouterResponse;
    return extractImageFromResponse(result);
  }
}

export default OpenRouterProvider;
