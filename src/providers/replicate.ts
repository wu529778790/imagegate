/**
 * Replicate image generation provider.
 *
 * Uses the Replicate API with /v1/predictions endpoint.
 * Supports async task-based generation (inspired by One API).
 */

import { BaseProvider } from "./base";
import type { GenerateImageOptions, Provider } from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictionResponse {
  id: string;
  status: string;
  output: unknown;
  error: string | null;
  urls?: { get?: string };
  completed_at?: string;
}

interface ReplicateImageRequest {
  input: {
    prompt: string;
    aspect_ratio?: string;
    width?: number;
    height?: number;
    num_outputs?: number;
  };
  version?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseModelId(model: string): { owner: string; name: string; version: string | null } {
  const [ownerName, version] = model.split(":");
  const parts = ownerName!.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new ProviderError(
      "replicate",
      undefined,
      `Invalid Replicate model format: "${model}". Expected "owner/name" or "owner/name:version".`,
    );
  }
  return { owner: parts[0], name: parts[1], version: version || null };
}

function extractOutputUrl(prediction: PredictionResponse): string {
  const output = prediction.output;

  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    if (output.length === 0) {
      throw new ProviderError("replicate", undefined, "Replicate returned empty output array");
    }
    const first = output[0];
    if (typeof first === "string") return first;
  }

  if (output && typeof output === "object" && "url" in output) {
    const url = (output as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }

  throw new ProviderError(
    "replicate",
    undefined,
    `Unexpected Replicate output format: ${JSON.stringify(output)}`,
  );
}

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export class ReplicateProvider extends BaseProvider {
  readonly name: Provider = "replicate";
  readonly defaultModel = "google/nano-banana-2";

  constructor(baseUrl?: string) {
    super(baseUrl ?? "https://api.replicate.com");
  }

  /**
   * Override to handle Replicate's async task-based API flow.
   * Replicate uses predictions that need to be polled.
   */
  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError(this.name, undefined, "API token is required");
    }

    const resolvedModel = model || this.defaultModel;
    const parsedModel = parseModelId(resolvedModel);

    // Build request body
    const input = {
      prompt,
      ...(options.aspectRatio && { aspect_ratio: options.aspectRatio }),
      ...(options.size && (() => {
        const [width, height] = options.size!.split(/[xX*]/).map(Number);
        return width && height ? { width, height } : {};
      })()),
      ...(options.n && options.n > 1 && { num_outputs: options.n }),
    };

    const body: ReplicateImageRequest = { input };
    if (parsedModel.version) {
      body.version = parsedModel.version;
    }

    // Determine URL
    let url: string;
    if (parsedModel.version) {
      url = `${this.baseUrl}/v1/predictions`;
    } else {
      url = `${this.baseUrl}/v1/models/${parsedModel.owner}/${parsedModel.name}/predictions`;
    }

    // Make initial request
    const response = await this.makeReplicateRequest<PredictionResponse>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Prefer: "wait=60",
      },
      body: JSON.stringify(body),
    });

    // If not succeeded, poll for results
    if (response.status !== "succeeded") {
      if (!response.urls?.get) {
        throw new ProviderError(this.name, undefined, "Replicate prediction did not return a poll URL");
      }

      const prediction = await this.pollReplicateTask(response.urls.get, apiKey);
      return this.extractFromPrediction(prediction);
    }

    return this.extractFromPrediction(response);
  }

  private async makeReplicateRequest<T>(
    url: string,
    options: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        this.name,
        response.status,
        `Replicate API error (${response.status}): ${errorText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async pollReplicateTask(
    pollUrl: string,
    apiKey: string,
    pollIntervalMs: number = 2000,
    maxPollMs: number = 300000,
  ): Promise<PredictionResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollMs) {
      const prediction = await this.makeReplicateRequest<PredictionResponse>(pollUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (prediction.status === "succeeded") {
        return prediction;
      }

      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new ProviderError(
          this.name,
          undefined,
          `Replicate prediction ${prediction.status}: ${prediction.error || "unknown error"}`,
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new ProviderError(this.name, undefined, "Replicate prediction polling timeout");
  }

  private async extractFromPrediction(prediction: PredictionResponse): Promise<Buffer> {
    const outputUrl = extractOutputUrl(prediction);

    // Download image
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      throw new ProviderError(
        this.name,
        imageResponse.status,
        `Failed to download image from Replicate: ${imageResponse.status}`,
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export default ReplicateProvider;
