/**
 * Jimeng (即梦) image generation provider.
 *
 * Uses the Volcengine API with visual/v1/async_submit endpoint.
 * Supports async task-based generation (inspired by One API).
 */

import { BaseProvider, parseAspectRatio, sizeFromAspectRatio } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JimengSubmitResponse {
  code?: number;
  data?: {
    task_id?: string;
  };
  message?: string;
}

interface JimengQueryResponse {
  code?: number;
  data?: {
    status?: string;
    image_urls?: string[];
  };
  message?: string;
}

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class JimengProvider extends BaseProvider {
  readonly name: Provider = "jimeng";
  readonly defaultModel = "jimeng_t2i_v40";

  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(options?: { baseUrl?: string; accessKeyId?: string; secretAccessKey?: string }) {
    super(options?.baseUrl ?? "https://visual.volcengineapi.com");
    this.accessKeyId = options?.accessKeyId ?? "";
    this.secretAccessKey = options?.secretAccessKey ?? "";
  }

  /**
   * Override to handle Jimeng's async task-based API flow.
   */
  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    // For Jimeng, apiKey should be accessKeyId:secretAccessKey format
    const [accessKeyId, secretAccessKey] = apiKey.includes(":")
      ? apiKey.split(":")
      : [this.accessKeyId || apiKey, this.secretAccessKey];

    if (!accessKeyId || !secretAccessKey) {
      throw new ProviderError(this.name, undefined, "Access key and secret key are required");
    }

    const resolvedModel = model || this.defaultModel;
    const size = this.resolveSize(options);

    const url = `${this.baseUrl}/v1/visual/async_submit`;

    const body = {
      model: resolvedModel,
      prompt,
      size,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessKeyId}:${secretAccessKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `Jimeng API error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as JimengSubmitResponse;

    if (result.code !== 0) {
      throw new ProviderError(this.name, undefined, `Jimeng error: ${result.message}`);
    }

    const taskId = result.data?.task_id;
    if (!taskId) {
      throw new ProviderError(this.name, undefined, "No task ID in Jimeng response");
    }

    // Poll for task completion
    const imageUrls = await this.pollJimengTask(taskId, accessKeyId, secretAccessKey);

    // Download and return image
    return this.extractFromUrls(imageUrls);
  }

  private resolveSize(options: GenerateImageOptions): string {
    if (options.size) {
      const parsed = parseAspectRatio(options.size);
      if (parsed) {
        return `${parsed.width}x${parsed.height}`;
      }
    }

    if (options.aspectRatio) {
      const size = sizeFromAspectRatio(options.aspectRatio, 1024 * 1024, 16);
      if (size) {
        return size;
      }
    }

    return "1024x1024";
  }

  private async pollJimengTask(
    taskId: string,
    accessKeyId: string,
    secretAccessKey: string,
    pollIntervalMs: number = 1000,
    maxPollAttempts: number = 60,
  ): Promise<string[]> {
    const url = `${this.baseUrl}/v1/visual/async_query`;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessKeyId}:${secretAccessKey}`,
        },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new ProviderError(
          this.name,
          response.status,
          `Jimeng query error (${response.status}): ${errorText}`,
        );
      }

      const result = (await response.json()) as JimengQueryResponse;

      if (result.code !== 0) {
        throw new ProviderError(this.name, undefined, `Jimeng query error: ${result.message}`);
      }

      if (result.data?.status === "done" && result.data?.image_urls) {
        return result.data.image_urls;
      }

      if (result.data?.status === "failed") {
        throw new ProviderError(this.name, undefined, "Jimeng task failed");
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new ProviderError(this.name, undefined, "Jimeng task polling timeout");
  }

  private async extractFromUrls(urls: string[]): Promise<Buffer> {
    const imageUrl = urls[0];
    if (!imageUrl) {
      throw new ProviderError(this.name, undefined, "No image URL in Jimeng response");
    }

    const imageResponse = await fetch(imageUrl);
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
}

export default JimengProvider;
