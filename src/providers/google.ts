/**
 * Google Gemini image generation provider.
 *
 * Uses the Gemini API with /v1beta/models/{model}:generateContent endpoint.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
} from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

async function extractImageFromResponse(result: GeminiResponse): Promise<Buffer> {
  for (const candidate of result.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }
  throw new Error("No image in Gemini response");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class GoogleProvider implements ImageProvider {
  readonly name = "google" as const;
  readonly defaultModel = "gemini-2.0-flash-preview-image-generation";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? "https://generativelanguage.googleapis.com/v1beta")
      .replace(/\/+$/g, "");
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    _options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("google", undefined, "API key is required for Google provider.");
    }

    const resolvedModel = model || this.defaultModel;

    const url = `${this.baseUrl}/models/${resolvedModel}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError("google", response.status, `Google API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as GeminiResponse;
    return extractImageFromResponse(result);
  }
}

export default GoogleProvider;
