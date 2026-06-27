/**
 * Provider registry for image generation.
 *
 * Two simplified providers:
 *   - openai: OpenAI-compatible API (covers OpenAI, 通义, 智谱, 豆包, Google, etc.)
 *   - anthropic: Anthropic Messages API
 *
 * Usage:
 *   const provider = createProvider("openai", { baseUrl: "https://api.openai.com/v1" });
 *   const buf = await provider.generateImage("a cat", "gpt-image-2", "your-api-key");
 */

import type { GenerateImageOptions, ImageProvider, Provider } from "./types";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";

export type { GenerateImageOptions, ImageProvider, Provider, ProviderError } from "./types";
export { BaseProvider } from "./base";
export { OpenAIProvider } from "./openai";
export { AnthropicProvider } from "./anthropic";

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  /** Base URL override for the provider's API endpoint. */
  baseUrl?: string;
  /** Default model to use if none is specified in generateImage calls. */
  defaultModel?: string;
}

const PROVIDER_REGISTRY: Record<Provider, (config?: ProviderConfig) => ImageProvider> = {
  openai: (config) => new OpenAIProvider(config?.baseUrl, config?.defaultModel),
  anthropic: (config) => new AnthropicProvider(config?.baseUrl, config?.defaultModel),
};

/**
 * Create a provider instance by name.
 */
export function createProvider(name: Provider, config?: ProviderConfig): ImageProvider {
  const factory = PROVIDER_REGISTRY[name];
  if (!factory) throw new Error(`Unknown provider: ${name}`);
  return factory(config);
}

/**
 * Generate an image using a named provider.
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
