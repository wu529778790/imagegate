/** Supported image generation providers. */
export type Provider = "zai" | "xiaomi";

/** Quality preset for image generation. */
export type Quality = "normal" | "2k";

/** Options for image generation. */
export interface GenerateImageOptions {
  /** Aspect ratio as "W:H", e.g. "16:9", "1:1". */
  aspectRatio?: string;

  /** Explicit pixel size as "WxH", e.g. "1280x1280". */
  size?: string;

  /** Quality preset: "normal" for standard, "2k" for high quality. */
  quality?: Quality;

  /** Number of images to generate (not all providers support >1). */
  n?: number;
}

/** Standard interface for all image generation providers. */
export interface ImageProvider {
  /** Unique provider name. */
  readonly name: Provider;

  /** Default model for this provider. */
  readonly defaultModel: string;

  /**
   * Generate an image from a text prompt.
   *
   * @param prompt - The text prompt describing the desired image.
   * @param model - The model identifier (e.g. "cogview-3").
   * @param apiKey - API key for the provider.
   * @param options - Generation options (aspect ratio, quality, etc.).
   * @returns A Buffer containing the PNG image bytes.
   */
  generateImage(
    prompt: string,
    model: string,
    apiKey: string,
    options?: GenerateImageOptions,
  ): Promise<Buffer>;
}

/** API response type for Z.AI image generation. */
export interface ZaiApiResponse {
  data?: Array<{ url?: string }>;
}

/** API response type for OpenAI-compatible image generation. */
export interface OpenAIImageApiResponse {
  data: Array<{ url?: string; b64_json?: string }>;
}

/** Error class for provider-specific errors. */
export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly statusCode: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
