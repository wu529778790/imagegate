/**
 * DashScope (阿里通义万相) image generation provider.
 *
 * Uses the DashScope API with /v1/services/aigc/text2image/image-synthesis endpoint.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
  Quality,
} from "./types";
import { ProviderError } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAspectRatio(ar: string): { width: number; height: number } | null {
  const match = ar.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const w = parseFloat(match[1]!);
  const h = parseFloat(match[2]!);
  if (w <= 0 || h <= 0) return null;
  return { width: w, height: h };
}

function parsePixelSize(value: string): { width: number; height: number } | null {
  const match = value.match(/^(\d+)\s*[xX*]\s*(\d+)$/);
  if (!match) return null;
  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function roundToMultiple(value: number, multiple: number): number {
  return Math.max(multiple, Math.round(value / multiple) * multiple);
}

function buildSizeFromAspectRatio(ar: string | null, quality: Quality): string {
  const parsed = ar ? parseAspectRatio(ar) : null;
  const ratio = parsed ? parsed.width / parsed.height : 1;

  if (!parsed || (parsed.width === parsed.height)) {
    const edge = quality === "2k" ? 1536 : 1024;
    return `${edge}*${edge}`;
  }

  const targetLongEdge = quality === "2k" ? 1536 : 1024;
  let width: number;
  let height: number;

  if (ratio > 1) {
    width = targetLongEdge;
    height = roundToMultiple(width / ratio, 32);
  } else {
    height = targetLongEdge;
    width = roundToMultiple(height * ratio, 32);
  }

  return `${width}*${height}`;
}

function resolveSize(model: string, options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">): string {
  if (options.size) {
    const parsed = parsePixelSize(options.size);
    if (!parsed) {
      throw new Error("Size must be in WxH format, for example 1024*1024.");
    }
    return `${parsed.width}*${parsed.height}`;
  }

  return buildSizeFromAspectRatio(options.aspectRatio ?? null, options.quality ?? "2k");
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface DashScopeSyncResponse {
  output?: {
    results?: Array<{
      url?: string;
    }>;
  };
}

interface DashScopeAsyncResponse {
  output?: {
    task_id?: string;
    task_status?: string;
  };
}

async function pollForResult(taskId: string, apiKey: string, maxAttempts = 60): Promise<string> {
  const url = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll task: ${response.status}`);
    }

    const result = (await response.json()) as DashScopeAsyncResponse;

    if (result.output?.task_status === "SUCCEEDED") {
      // Need to get the actual URL from the results
      const resultsUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}/results`;
      const resultsResponse = await fetch(resultsUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!resultsResponse.ok) {
        throw new Error(`Failed to get task results: ${resultsResponse.status}`);
      }

      const results = (await resultsResponse.json()) as DashScopeSyncResponse;
      const imageUrl = results.output?.results?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL in task results");
      }
      return imageUrl;
    }

    if (result.output?.task_status === "FAILED") {
      throw new Error("DashScope task failed");
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("DashScope task timed out");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class DashScopeProvider implements ImageProvider {
  readonly name = "dashscope" as const;
  readonly defaultModel = "qwen-image-2.0-pro";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // DashScope API endpoint: https://dashscope.aliyuncs.com/api/v1
    // The full endpoint for image generation is: /services/aigc/text2image/image-synthesis
    this.baseUrl = (baseUrl ?? "https://dashscope.aliyuncs.com/api/v1")
      .replace(/\/+$/g, "");
  }

  private getImageEndpoint(): string {
    // Always use the correct endpoint for DashScope image generation
    return "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
  }

  async generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options: GenerateImageOptions = {},
  ): Promise<Buffer> {
    if (!apiKey) {
      throw new ProviderError("dashscope", undefined, "API key is required for DashScope provider.");
    }

    const resolvedModel = model || this.defaultModel;
    const size = resolveSize(resolvedModel, options);

    // Use the correct endpoint
    const url = this.getImageEndpoint();

    const body = {
      model: resolvedModel,
      input: {
        prompt,
      },
      parameters: {
        size,
        n: 1,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ProviderError("dashscope", response.status, `DashScope API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as DashScopeAsyncResponse;
    const taskId = result.output?.task_id;

    if (!taskId) {
      throw new Error("No task ID in DashScope response");
    }

    // Poll for results
    const imageUrl = await pollForResult(taskId, apiKey);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export default DashScopeProvider;
