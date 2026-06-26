/**
 * Google Gemini image generation provider.
 *
 * Uses the Gemini API with /v1beta/models/{model}:generateContent endpoint.
 */

import { BaseProvider } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
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

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class GoogleProvider extends BaseProvider {
  readonly name: Provider = "google";
  readonly defaultModel = "gemini-2.0-flash-preview-image-generation";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://generativelanguage.googleapis.com");
  }

  private getModelPath(model: string): string {
    const modelId = model.startsWith("models/") ? model.slice("models/".length) : model;
    return `models/${modelId}`;
  }

  /**
   * Override to build Gemini-specific URL.
   */
  protected getImageUrl(): string {
    return this.baseUrl; // Will be overridden in generateImage
  }

  /**
   * Override to use Gemini's API key header.
   */
  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    };
  }

  /**
   * Override to handle Gemini's specific request format.
   */
  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    _options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError(this.name, undefined, "API key is required");
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
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `Google API error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as GeminiResponse;
    return this.extractFromGeminiResponse(result);
  }

  private async extractFromGeminiResponse(result: GeminiResponse): Promise<Buffer> {
    for (const candidate of result.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, "base64");
        }
      }
    }

    throw new ProviderError(this.name, undefined, "No image in Gemini response");
  }
}

export default GoogleProvider;
