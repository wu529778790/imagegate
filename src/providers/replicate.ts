/**
 * Replicate image generation provider.
 *
 * Uses the Replicate API with /v1/predictions endpoint.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
} from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface ReplicatePrediction {
  id: string;
  status: string;
  output?: string | string[];
  error?: string;
}

async function waitForPrediction(predictionId: string, apiKey: string, maxAttempts = 60): Promise<string[]> {
  const url = `https://api.replicate.com/v1/predictions/${predictionId}`;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get prediction: ${response.status}`);
    }

    const prediction = (await response.json()) as ReplicatePrediction;

    if (prediction.status === "succeeded") {
      const output = prediction.output;
      if (Array.isArray(output)) {
        return output;
      }
      if (typeof output === "string") {
        return [output];
      }
      throw new Error("No output in prediction");
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(`Replicate prediction failed: ${prediction.error}`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Replicate prediction timed out");
}

async function extractImageFromUrls(urls: string[]): Promise<Buffer> {
  const imageUrl = urls[0];
  if (!imageUrl) {
    throw new Error("No image URL in Replicate response");
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class ReplicateProvider implements ImageProvider {
  readonly name = "replicate" as const;
  readonly defaultModel = "google/nano-banana-2";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? "https://api.replicate.com/v1")
      .replace(/\/+$/g, "");
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("replicate", undefined, "API token is required for Replicate provider.");
    }

    const resolvedModel = model || this.defaultModel;

    const url = `${this.baseUrl}/predictions`;

    const body = {
      version: resolvedModel,
      input: {
        prompt,
        aspect_ratio: options.aspectRatio ?? "1:1",
      },
    };

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
      throw new ProviderError("replicate", response.status, `Replicate API error (${response.status}): ${errText}`);
    }

    const prediction = (await response.json()) as ReplicatePrediction;

    // Wait for prediction to complete
    const imageUrls = await waitForPrediction(prediction.id, apiKey);
    return extractImageFromUrls(imageUrls);
  }
}

export default ReplicateProvider;
