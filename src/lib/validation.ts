/**
 * Input validation schemas using Zod.
 * Provides type-safe validation for all API inputs.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Common schemas
// ---------------------------------------------------------------------------

export const ProviderSchema = z.enum([
  "zai",
  "openai",
  "google",
  "openrouter",
  "dashscope",
  "minimax",
  "replicate",
  "jimeng",
  "seedream",
  "azure",
]);

export const QualitySchema = z.enum(["normal", "2k"]);

export const AspectRatioSchema = z
  .string()
  .regex(/^\d+(\.\d+)?:\d+(\.\d+)?$/, "Invalid aspect ratio format (e.g., 16:9, 1:1)")
  .optional();

export const SizeSchema = z
  .string()
  .regex(/^\d+[xX*]\d+$/, "Invalid size format (e.g., 1024x1024)")
  .optional();

// ---------------------------------------------------------------------------
// Generate image schema
// ---------------------------------------------------------------------------

export const GenerateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(10000, "Prompt too long (max 10000 characters)"),
  provider: ProviderSchema.optional(),
  model: z.string().max(100).optional(),
  ar: AspectRatioSchema,
  quality: QualitySchema.optional(),
  n: z.number().int().min(1).max(10).optional(),
  size: SizeSchema,
});

export type GenerateImageInput = z.infer<typeof GenerateImageSchema>;

// ---------------------------------------------------------------------------
// API Key schema
// ---------------------------------------------------------------------------

export const AddKeySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  provider: ProviderSchema,
  api_key: z
    .string()
    .min(1, "API key is required")
    .max(500, "API key too long"),
});

export const UpdateKeySchema = z.object({
  id: z.number().int().positive(),
  is_active: z.boolean().optional(),
});

export const DeleteKeySchema = z.object({
  id: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Settings schema
// ---------------------------------------------------------------------------

const SETTINGS_KEYS = [
  "default_provider",
  "default_quality",
  "default_ar",
  "zai_api_key",
  "zai_base_url",
  "zai_model",
  "openai_api_key",
  "openai_base_url",
  "openai_model",
  "google_api_key",
  "google_base_url",
  "google_model",
  "openrouter_api_key",
  "openrouter_base_url",
  "openrouter_model",
  "dashscope_api_key",
  "dashscope_base_url",
  "dashscope_model",
  "minimax_api_key",
  "minimax_base_url",
  "minimax_model",
  "replicate_api_key",
  "replicate_base_url",
  "replicate_model",
  "jimeng_api_key",
  "jimeng_base_url",
  "jimeng_model",
  "seedream_api_key",
  "seedream_base_url",
  "seedream_model",
  "azure_api_key",
  "azure_base_url",
  "azure_model",
] as const;

export const SettingsSchema = z.record(
  z.enum(SETTINGS_KEYS),
  z.string().max(1000)
);

// ---------------------------------------------------------------------------
// Records query schema
// ---------------------------------------------------------------------------

export const RecordsQuerySchema = z.object({
  provider: ProviderSchema.optional(),
  status: z.enum(["pending", "success", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Sync schema
// ---------------------------------------------------------------------------

export const SyncActionSchema = z.object({
  action: z.enum(["sync-image", "retry-all"]),
  imageId: z.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export class ValidationError extends Error {
  public readonly zodError: z.ZodError;

  constructor(errors: z.ZodError) {
    const message = (errors as any).errors
      .map((e: any) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    super(message);
    this.name = "ValidationError";
    this.zodError = errors;
  }
}

/**
 * Validate data against a schema and throw ValidationError if invalid
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

/**
 * Validate data and return errors without throwing
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: (result.error as any).errors.map(
      (e: any) => `${e.path.join(".")}: ${e.message}`
    ),
  };
}
