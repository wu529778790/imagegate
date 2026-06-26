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
// Helpers
// ---------------------------------------------------------------------------

function parseModelId(model: string): { owner: string; name: string; version: string | null } {
  const [ownerName, version] = model.split(":");
  const parts = ownerName!.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid Replicate model format: "${model}". Expected "owner/name" or "owner/name:version".`
    );
  }
  return { owner: parts[0], name: parts[1], version: version || null };
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface PredictionResponse {
  id: string;
  status: string;
  output: unknown;
  error: string | null;
  urls?: { get?: string };
}

function extractOutputUrl(prediction: PredictionResponse): string {
  const output = prediction.output;

  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    if (output.length !== 1) {
      throw new Error(
        `Replicate returned ${output.length} outputs, but we currently support saving exactly one image per request.`
      );
    }
    const first = output[0];
    if (typeof first === "string") return first;
  }

  if (output && typeof output === "object" && "url" in output) {
    const url = (output as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }

  throw new Error(`Unexpected Replicate output format: ${JSON.stringify(output)}`);
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image from Replicate: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
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
    // Replicate base URL: https://api.replicate.com
    this.baseUrl = (baseUrl ?? "https://api.replicate.com")
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
    const parsedModel = parseModelId(resolvedModel);

    const input: Record<string, unknown> = {
      prompt,
    };

    if (options.aspectRatio) {
      input.aspect_ratio = options.aspectRatio;
    }

    let url: string;
    const body: Record<string, unknown> = { input };

    if (parsedModel.version) {
      url = `${this.baseUrl}/v1/predictions`;
      body.version = parsedModel.version;
    } else {
      url = `${this.baseUrl}/v1/models/${parsedModel.owner}/${parsedModel.name}/predictions`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Prefer: "wait=60",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError("replicate", response.status, `Replicate API error (${response.status}): ${errText}`);
    }

    let prediction = (await response.json()) as PredictionResponse;

    // If not succeeded, poll for results
    if (prediction.status !== "succeeded") {
      if (!prediction.urls?.get) {
        throw new Error("Replicate prediction did not return a poll URL");
      }

      const pollUrl = prediction.urls.get;
      const maxPollMs = 300_000;
      const pollIntervalMs = 2000;
      const start = Date.now();

      while (Date.now() - start < maxPollMs) {
        const pollResponse = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (!pollResponse.ok) {
          const errText = await pollResponse.text();
          throw new Error(`Replicate poll error (${pollResponse.status}): ${errText}`);
        }

        prediction = (await pollResponse.json()) as PredictionResponse;

        if (prediction.status === "succeeded") break;
        if (prediction.status === "failed" || prediction.status === "canceled") {
          throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error || "unknown error"}`);
        }

        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      if (prediction.status !== "succeeded") {
        throw new Error("Replicate prediction timed out");
      }
    }

    const outputUrl = extractOutputUrl(prediction);
    return downloadImage(outputUrl);
  }
}

export default ReplicateProvider;
