/**
 * OpenAI GPT Image 2 provider.
 *
 * Uses the refactored OpenAICompatibleProvider base class.
 */

import { OpenAICompatibleProvider } from "./openai-compatible";
import type { Provider } from "./types";

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(baseUrl?: string) {
    super("openai" as Provider, {
      baseUrl: baseUrl ?? "https://api.openai.com/v1",
      defaultModel: "gpt-image-2",
    });
  }
}

export default OpenAIProvider;
