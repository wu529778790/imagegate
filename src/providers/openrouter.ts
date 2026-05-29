/**
 * OpenRouter image generation provider.
 *
 * Uses the /chat/completions endpoint with image generation models.
 */

import { OpenAICompatibleProvider } from "./openai-compatible";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(baseUrl?: string) {
    super("openrouter", {
      baseUrl: baseUrl ?? "https://openrouter.ai/api/v1",
      defaultModel: "google/gemini-2.0-flash-preview-image-generation",
      useChatEndpoint: true,
    });
  }
}

export default OpenRouterProvider;
