/**
 * Seedream (豆包) image generation provider.
 *
 * Uses the Volcengine ARK API with /v1/images/generations endpoint.
 */

import { OpenAICompatibleProvider } from "./openai-compatible";

export class SeedreamProvider extends OpenAICompatibleProvider {
  constructor(baseUrl?: string) {
    super("seedream", {
      baseUrl: baseUrl ?? "https://ark.cn-beijing.volces.com/api/v3",
      defaultModel: "doubao-seedream-5-0-260128",
    });
  }
}

export default SeedreamProvider;
