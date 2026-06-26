/**
 * DashScope (阿里通义万相) image generation provider.
 *
 * Uses the DashScope multimodal-generation API endpoint.
 * Supports async task-based generation (inspired by One API's Ali adaptor).
 */

import { BaseProvider, sizeFromAspectRatio } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types for async task API
// ---------------------------------------------------------------------------

interface DashScopeTaskResponse {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{
      url?: string;
      b64_image?: string;
    }>;
    message?: string;
    code?: string;
  };
  request_id?: string;
  message?: string;
}

interface DashScopeImageRequest {
  model: string;
  input: {
    prompt: string;
    negative_prompt?: string;
  };
  parameters?: {
    size?: string;
    n?: number;
    style?: string;
    seed?: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_SIZES = [
  "1024*1024",
  "720*1280",
  "1280*720",
  "768*1024",
  "1024*768",
  "512*512",
];

const DEFAULT_SIZE = "1024*1024";

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class DashScopeProvider extends BaseProvider {
  readonly name: Provider = "dashscope";
  readonly defaultModel = "wanx-v1";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://dashscope.aliyuncs.com/api/v1");
  }

  /**
   * Override to handle DashScope's async task-based API flow.
   * This completely replaces the base class's synchronous flow.
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

    const url = `${this.baseUrl}/services/aigc/text2image/image-synthesis`;
    const body = this.buildDashScopeRequestBody(prompt, model, options);
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-DashScope-Async": "enable", // Enable async mode
    };

    // Make initial request to get task ID
    const response = await this.makeDashScopeRequest<DashScopeTaskResponse>(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Check for immediate error
    if (response.message) {
      throw new ProviderError(this.name, undefined, `DashScope error: ${response.message}`);
    }

    const taskId = response.output?.task_id;
    if (!taskId) {
      throw new ProviderError(this.name, undefined, "No task ID in DashScope response");
    }

    // Poll for task completion
    const result = await this.pollDashScopeTask(taskId, apiKey);

    // Extract image from completed task
    return this.extractFromTaskResult(result);
  }

  private buildDashScopeRequestBody(
    prompt: string,
    model: string,
    options: GenerateImageOptions,
  ): DashScopeImageRequest {
    const size = this.resolveSize(options);
    const n = Math.min(options.n ?? 1, 4); // DashScope supports up to 4 images

    return {
      model,
      input: {
        prompt,
      },
      parameters: {
        size,
        n,
      },
    };
  }

  private resolveSize(options: GenerateImageOptions): string {
    if (options.size) {
      // Convert WxH format to W*H format
      const normalized = options.size.replace(/[xX*]/g, "*");
      if (SUPPORTED_SIZES.includes(normalized)) {
        return normalized;
      }
    }

    if (options.aspectRatio) {
      const size = sizeFromAspectRatio(options.aspectRatio, 1024 * 1024, 8);
      if (size) {
        // Convert WxH to W*H
        return size.replace("x", "*");
      }
    }

    return DEFAULT_SIZE;
  }

  private async makeDashScopeRequest<T>(
    url: string,
    options: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `DashScope API error (${response.status}): ${errorText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async pollDashScopeTask(
    taskId: string,
    apiKey: string,
    pollIntervalMs: number = 2000,
    maxPollAttempts: number = 30,
  ): Promise<DashScopeTaskResponse> {
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      const taskUrl = `${this.baseUrl}/tasks/${taskId}`;
      const result = await this.makeDashScopeRequest<DashScopeTaskResponse>(taskUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      // Check if task is complete
      const status = result.output?.task_status;
      if (status === "SUCCEEDED" || status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new ProviderError(this.name, undefined, "DashScope task polling timeout");
  }

  private async extractFromTaskResult(result: DashScopeTaskResponse): Promise<Buffer> {
    const status = result.output?.task_status;

    if (status === "FAILED") {
      const errorMsg = result.output?.message || "Unknown error";
      throw new ProviderError(this.name, undefined, `DashScope task failed: ${errorMsg}`);
    }

    if (status === "CANCELED") {
      throw new ProviderError(this.name, undefined, "DashScope task was canceled");
    }

    if (status !== "SUCCEEDED") {
      throw new ProviderError(this.name, undefined, `DashScope task status: ${status}`);
    }

    const results = result.output?.results;
    if (!results || results.length === 0) {
      throw new ProviderError(this.name, undefined, "No results in DashScope task response");
    }

    const firstResult = results[0];
    if (!firstResult) {
      throw new ProviderError(this.name, undefined, "Empty result in DashScope task response");
    }

    // Handle base64 response
    if (firstResult.b64_image) {
      return Buffer.from(firstResult.b64_image, "base64");
    }

    // Handle URL response
    if (firstResult.url) {
      const imageResponse = await fetch(firstResult.url);
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

    throw new ProviderError(this.name, undefined, "No image data in DashScope result");
  }
}

export default DashScopeProvider;
