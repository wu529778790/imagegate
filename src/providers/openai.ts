/**
 * OpenAI GPT Image 2 provider.
 */

import { OpenAICompatibleProvider } from "./openai-compatible";

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(baseUrl?: string) {
    super("openai", {
      baseUrl: baseUrl ?? "https://api.openai.com/v1",
      defaultModel: "gpt-image-2",
    });
  }
}

export default OpenAIProvider;
