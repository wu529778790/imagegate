/**
 * Jimeng (即梦) image generation provider.
 *
 * Uses the Volcengine API with visual/v1/async_submit endpoint.
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
  const match = value.match(/^(\d+)\s*[xX]\s*(\d+)$/);
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
    const edge = quality === "2k" ? 2048 : 1024;
    return `${edge}x${edge}`;
  }

  const targetLongEdge = quality === "2k" ? 2048 : 1024;
  let width: number;
  let height: number;

  if (ratio > 1) {
    width = targetLongEdge;
    height = roundToMultiple(width / ratio, 16);
  } else {
    height = targetLongEdge;
    width = roundToMultiple(height * ratio, 16);
  }

  while (width * height < 655_360) {
    if (ratio > 1) {
      width += 16;
      height = roundToMultiple(width / ratio, 16);
    } else {
      height += 16;
      width = roundToMultiple(height * ratio, 16);
    }
  }

  return `${width}x${height}`;
}

function resolveSize(options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">): string {
  if (options.size) {
    const parsed = parsePixelSize(options.size);
    if (!parsed) {
      throw new Error("Size must be in WxH format, for example 1024x1024.");
    }
    if (parsed.width % 16 !== 0 || parsed.height % 16 !== 0) {
      throw new Error("Width and height must both be multiples of 16.");
    }
    if (parsed.width * parsed.height < 655_360) {
      throw new Error("Image must be at least 655,360 pixels (e.g. 816x816).");
    }
    return `${parsed.width}x${parsed.height}`;
  }

  return buildSizeFromAspectRatio(options.aspectRatio ?? null, options.quality ?? "2k");
}

// ---------------------------------------------------------------------------
// Response handling
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

async function waitForResult(taskId: string, accessKeyId: string, secretAccessKey: string, maxAttempts = 60): Promise<string[]> {
  const url = `https://visual.volcengineapi.com/v1/visual/async_query`;

  for (let i = 0; i < maxAttempts; i++) {
    // For simplicity, using basic auth. In production, you'd use proper Volcengine signing.
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessKeyId}:${secretAccessKey}`,
      },
      body: JSON.stringify({ task_id: taskId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to query task: ${response.status}`);
    }

    const result = (await response.json()) as JimengQueryResponse;

    if (result.code !== 0) {
      throw new Error(`Jimeng query error: ${result.message}`);
    }

    if (result.data?.status === "done" && result.data?.image_urls) {
      return result.data.image_urls;
    }

    if (result.data?.status === "failed") {
      throw new Error("Jimeng task failed");
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Jimeng task timed out");
}

async function extractImageFromUrls(urls: string[]): Promise<Buffer> {
  const imageUrl = urls[0];
  if (!imageUrl) {
    throw new Error("No image URL in Jimeng response");
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

export class JimengProvider implements ImageProvider {
  readonly name = "jimeng" as const;
  readonly defaultModel = "jimeng_t2i_v40";

  private readonly baseUrl: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(options?: { baseUrl?: string; accessKeyId?: string; secretAccessKey?: string }) {
    this.baseUrl = (options?.baseUrl ?? "https://visual.volcengineapi.com")
      .replace(/\/+$/g, "");
    this.accessKeyId = options?.accessKeyId ?? "";
    this.secretAccessKey = options?.secretAccessKey ?? "";
  }

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
      throw new ProviderError("jimeng", undefined, "Access key and secret key are required for Jimeng provider.");
    }

    const resolvedModel = model || this.defaultModel;
    const size = resolveSize(options);

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
      const errText = await response.text();
      throw new ProviderError("jimeng", response.status, `Jimeng API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as JimengSubmitResponse;

    if (result.code !== 0) {
      throw new ProviderError("jimeng", undefined, `Jimeng error: ${result.message}`);
    }

    const taskId = result.data?.task_id;
    if (!taskId) {
      throw new ProviderError("jimeng", undefined, "No task ID in Jimeng response");
    }

    // Wait for results
    const imageUrls = await waitForResult(taskId, accessKeyId, secretAccessKey);
    return extractImageFromUrls(imageUrls);
  }
}

export default JimengProvider;
