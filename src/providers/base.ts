/**
 * Base provider class with common functionality.
 * Inspired by One API's adaptor pattern.
 */

import type { GenerateImageOptions, ImageProvider, Provider, Quality } from "./types";
import { ProviderError } from "./types";

/** Standard OpenAI-compatible image request format. */
export interface ImageRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  response_format?: "url" | "b64_json";
  user?: string;
}

/** Standard OpenAI-compatible image response format. */
export interface ImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

/** Options for async task-based providers. */
export interface AsyncTaskOptions {
  /** Polling interval in milliseconds. */
  pollIntervalMs?: number;
  /** Maximum number of polling attempts. */
  maxPollAttempts?: number;
}

/**
 * Abstract base class for image generation providers.
 * Provides common functionality for HTTP requests, error handling, and response parsing.
 */
export abstract class BaseProvider implements ImageProvider {
  abstract readonly name: Provider;
  abstract readonly defaultModel: string;

  protected readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? "").replace(/\/+$/g, "");
  }

  /**
   * Get the API endpoint URL for image generation.
   * Subclasses can override this for custom URL patterns.
   */
  protected getImageUrl(): string {
    return `${this.baseUrl}/images/generations`;
  }

  /**
   * Get request headers for the API call.
   * Subclasses can override for custom auth headers (e.g., JWT).
   */
  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  /**
   * Build the request body for image generation.
   * Subclasses can override for provider-specific request formats.
   */
  protected buildRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): ImageRequest {
    return {
      model,
      prompt,
      n: options.n ?? 1,
      size: options.size ?? "1024x1024",
      quality: options.quality === "normal" ? "standard" : "hd",
    };
  }

  /**
   * Extract image buffer from the API response.
   * Subclasses can override for provider-specific response formats.
   */
  protected async extractImageFromResponse(response: ImageResponse): Promise<Buffer> {
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new ProviderError(this.name, undefined, "No image data in response");
    }

    // Handle base64 response
    if (imageData.b64_json) {
      return Buffer.from(imageData.b64_json, "base64");
    }

    // Handle URL response
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

  /**
   * Make an HTTP request with error handling.
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `API error (${response.status}): ${errorText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Poll for async task completion (for providers like Ali/DashScope).
   * Override this method for providers that use task-based APIs.
   */
  protected async pollTaskResult<T>(
    taskId: string,
    apiKey: string,
    options: AsyncTaskOptions = {},
  ): Promise<T> {
    const { pollIntervalMs = 2000, maxPollAttempts = 30 } = options;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      const taskUrl = `${this.baseUrl}/tasks/${taskId}`;
      const result = await this.makeRequest<T>(taskUrl, {
        method: "GET",
        headers: this.getHeaders(apiKey),
      });

      // Check if task is complete (subclasses should override this logic)
      if (this.isTaskComplete(result)) {
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new ProviderError(this.name, undefined, "Task polling timeout");
  }

  /**
   * Check if an async task is complete.
   * Subclasses must override this for task-based providers.
   */
  protected isTaskComplete(_result: unknown): boolean {
    // Default implementation assumes synchronous API
    return true;
  }

  /**
   * Main image generation method.
   * Implements the standard OpenAI-compatible flow.
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
    const body = this.buildRequestBody(prompt, model, options);
    const headers = this.getHeaders(apiKey);

    const response = await this.makeRequest<ImageResponse>(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return this.extractImageFromResponse(response);
  }
}

/**
 * Helper function to convert Quality to provider-specific quality string.
 */
export function mapQuality(quality: Quality | undefined, mapping: Record<string, string>): string {
  const q = quality ?? "2k";
  return mapping[q] ?? mapping["default"] ?? "standard";
}

/**
 * Helper function to parse aspect ratio string.
 */
export function parseAspectRatio(ar: string): { width: number; height: number } | null {
  const match = ar.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

/**
 * Helper function to calculate size from aspect ratio.
 */
export function sizeFromAspectRatio(
  ar: string,
  targetPixels: number,
  step: number = 16,
): string | null {
  const parsed = parseAspectRatio(ar);
  if (!parsed) return null;

  const { width: ratioW, height: ratioH } = parsed;
  const scale = Math.sqrt(targetPixels / (ratioW * ratioH));

  let width = Math.round((ratioW * scale) / step) * step;
  let height = Math.round((ratioH * scale) / step) * step;

  // Ensure minimum size
  width = Math.max(width, step);
  height = Math.max(height, step);

  return `${width}x${height}`;
}
