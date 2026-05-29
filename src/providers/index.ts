/**
 * Provider registry for image generation.
 *
 * Usage:
 *   import { generateImage, createProvider } from "./providers/index.js";
 *
 *   // Direct call with provider name
 *   const buf = await generateImage("zai", "a cat", "cogview-3", "your-api-key");
 *
 *   // Or use a provider instance for multiple calls
 *   const provider = createProvider("zai", { baseUrl: "https://open.bigmodel.cn/api/paas/v4" });
 *   const buf = await provider.generateImage("a cat", "cogview-3", "your-api-key");
 */

import type { GenerateImageOptions, ImageProvider, Provider } from "./types";
import { ZaiProvider } from "./zai";
import { XiaomiProvider } from "./xiaomi";

export type { GenerateImageOptions, ImageProvider, Provider, ProviderError } from "./types";
export { ZaiProvider } from "./zai";
export { XiaomiProvider } from "./xiaomi";

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  /** Base URL override for the provider's API endpoint. */
  baseUrl?: string;
  /** Default model to use if none is specified in generateImage calls. */
  defaultModel?: string;
}

/** Single source of truth for all provider constructors. Each factory creates a provider from config. */
const PROVIDER_REGISTRY: Record<Provider, (config?: ProviderConfig) => ImageProvider> = {
  zai: (config) => new ZaiProvider(config?.baseUrl),
  xiaomi: (config) => new XiaomiProvider({ baseUrl: config?.baseUrl, defaultModel: config?.defaultModel }),
};

/**
 * Create a provider instance by name.
 *
 * @param name - The provider identifier.
 * @param config - Optional configuration overrides.
 * @returns An ImageProvider instance.
 */
export function createProvider(name: Provider, config?: ProviderConfig): ImageProvider {
  const factory = PROVIDER_REGISTRY[name];
  if (!factory) throw new Error(`Unknown provider: ${name}`);
  return factory(config);
}

/**
 * Generate an image using a named provider. This is a convenience wrapper
 * that creates a provider, calls generateImage, and returns the result.
 *
 * @param providerName - Which provider to use.
 * @param prompt - Text prompt describing the image.
 * @param model - Model identifier for the provider.
 * @param apiKey - API key for authentication.
 * @param options - Generation options (aspect ratio, quality, etc.).
 * @param config - Optional provider configuration overrides.
 * @returns A Buffer containing the image bytes.
 */
export async function generateImage(
  providerName: Provider,
  prompt: string,
  model: string,
  apiKey: string,
  options?: GenerateImageOptions,
  config?: ProviderConfig,
): Promise<Buffer> {
  const provider = createProvider(providerName, config);
  return provider.generateImage(prompt, model, apiKey, options);
}

/** List all available provider names. */
export function listProviders(): Provider[] {
  return Object.keys(PROVIDER_REGISTRY) as Provider[];
}
