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
    // Google Gemini base URL: https://generativelanguage.googleapis.com
    // The API endpoint will be: /v1beta/models/{model}:generateContent
    this.baseUrl = (baseUrl ?? "https://generativelanguage.googleapis.com")
      .replace(/\/+$/g, "");
  }

  private getModelPath(model: string): string {
    const modelId = model.startsWith("models/") ? model.slice("models/".length) : model;
    return `models/${modelId}`;
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
    const modelPath = this.getModelPath(resolvedModel);

    // Build URL with proper base path handling
    let baseUrl = this.baseUrl;
    if (!baseUrl.endsWith("/v1beta")) {
      baseUrl = `${baseUrl}/v1beta`;
    }
    const url = `${baseUrl}/${modelPath}:generateContent`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
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
