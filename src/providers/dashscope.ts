/**
 * DashScope (阿里通义万相) image generation provider.
 *
 * Uses the DashScope multimodal-generation API endpoint.
 */

import type {
  GenerateImageOptions,
  ImageProvider,
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
  const match = value.trim().match(/^(\d+)\s*[xX*]\s*(\d+)$/);
  if (!match) return null;
  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function roundToStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function resolveSize(options: Pick<GenerateImageOptions, "size" | "aspectRatio" | "quality">): string {
  if (options.size) {
    const parsed = parsePixelSize(options.size);
    if (!parsed) {
      throw new Error("Size must be in WxH format, for example 1024*1024.");
    }
    return `${parsed.width}*${parsed.height}`;
  }

  const quality = options.quality ?? "2k";
  const targetPixels = quality === "2k" ? 1536 * 1536 : 1024 * 1024;

  if (!options.aspectRatio) {
    const side = roundToStep(Math.sqrt(targetPixels), 16);
    return `${side}*${side}`;
  }

  const parsed = parseAspectRatio(options.aspectRatio);
  if (!parsed) {
    const side = roundToStep(Math.sqrt(targetPixels), 16);
    return `${side}*${side}`;
  }

  const ratio = parsed.width / parsed.height;
  const rawWidth = Math.sqrt(targetPixels * ratio);
  const rawHeight = Math.sqrt(targetPixels / ratio);
  const width = roundToStep(rawWidth, 16);
  const height = roundToStep(rawHeight, 16);

  return `${width}*${height}`;
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

interface DashScopeResponse {
  output?: {
    result_image?: string;
    choices?: Array<{
      message?: {
        content?: Array<{ image?: string }>;
      };
    }>;
  };
}

async function extractImageFromResponse(result: DashScopeResponse): Promise<Buffer> {
  let imageData: string | null = null;

  if (result.output?.result_image) {
    imageData = result.output.result_image;
  } else if (result.output?.choices?.[0]?.message?.content) {
    const content = result.output.choices[0].message.content;
    for (const item of content) {
      if (item.image) {
        imageData = item.image;
        break;
      }
    }
  }

  if (!imageData) {
    throw new Error("No image in DashScope response");
  }

  if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
    const imgRes = await fetch(imageData);
    if (!imgRes.ok) throw new Error("Failed to download image");
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return Buffer.from(imageData, "base64");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class DashScopeProvider implements ImageProvider {
  readonly name = "dashscope" as const;
  readonly defaultModel = "qwen-image-2.0-pro";

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // DashScope base URL: https://dashscope.aliyuncs.com
    // The API endpoint will be: /api/v1/services/aigc/multimodal-generation/generation
    this.baseUrl = (baseUrl ?? "https://dashscope.aliyuncs.com")
      .replace(/\/+$/g, "");
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
    const size = resolveSize(options);

    // Use the correct endpoint for DashScope multimodal generation
    const url = `${this.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`;

    const body = {
      model: resolvedModel,
      input: {
        messages: [
          {
            role: "user",
            content: [
              { text: prompt },
            ],
          },
        ],
      },
      parameters: {
        size,
        n: 1,
        watermark: false,
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
      throw new ProviderError("dashscope", response.status, `DashScope API error (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as DashScopeResponse;
    return extractImageFromResponse(result);
  }
}

export default DashScopeProvider;
