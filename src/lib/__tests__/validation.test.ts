import {
  GenerateImageSchema,
  AddKeySchema,
  RecordsQuerySchema,
  validate,
  validateSafe,
  ValidationError,
} from "../validation";

describe("Validation Library", () => {
  describe("GenerateImageSchema", () => {
    it("should validate valid input", () => {
      const input = {
        prompt: "a cute cat",
        provider: "openai",
        quality: "2k",
        ar: "16:9",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should require prompt", () => {
      const input = {
        provider: "openai",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject prompt that is too long", () => {
      const input = {
        prompt: "a".repeat(10001),
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should validate optional fields", () => {
      const input = {
        prompt: "a cute cat",
        model: "gpt-image-2",
        ar: "1:1",
        quality: "normal",
        n: 2,
        size: "1024x1024",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid provider", () => {
      const input = {
        prompt: "a cute cat",
        provider: "invalid-provider",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid aspect ratio format", () => {
      const input = {
        prompt: "a cute cat",
        ar: "invalid",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept valid aspect ratio", () => {
      const input = {
        prompt: "a cute cat",
        ar: "16:9",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid size format", () => {
      const input = {
        prompt: "a cute cat",
        size: "invalid",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept valid size", () => {
      const input = {
        prompt: "a cute cat",
        size: "1024x1024",
      };

      const result = GenerateImageSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("AddKeySchema", () => {
    it("should validate valid input", () => {
      const input = {
        name: "My Z.AI Key",
        provider: "openai",
        api_key: "sk-1234567890",
      };

      const result = AddKeySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should require name", () => {
      const input = {
        provider: "openai",
        api_key: "sk-1234567890",
      };

      const result = AddKeySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should require provider", () => {
      const input = {
        name: "My Key",
        api_key: "sk-1234567890",
      };

      const result = AddKeySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should require api_key", () => {
      const input = {
        name: "My Key",
        provider: "openai",
      };

      const result = AddKeySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject name that is too long", () => {
      const input = {
        name: "a".repeat(101),
        provider: "openai",
        api_key: "sk-1234567890",
      };

      const result = AddKeySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("RecordsQuerySchema", () => {
    it("should validate with defaults", () => {
      const input = {};

      const result = RecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it("should validate with custom values", () => {
      const input = {
        provider: "openai",
        status: "success",
        page: 2,
        pageSize: 10,
      };

      const result = RecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const input = {
        status: "invalid",
      };

      const result = RecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject page less than 1", () => {
      const input = {
        page: 0,
      };

      const result = RecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject pageSize greater than 100", () => {
      const input = {
        pageSize: 101,
      };

      const result = RecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("validate", () => {
    it("should return validated data", () => {
      const input = {
        prompt: "a cute cat",
        provider: "openai",
      };

      const result = validate(GenerateImageSchema, input);
      expect(result.prompt).toBe("a cute cat");
      expect(result.provider).toBe("openai");
    });

    it("should throw ValidationError for invalid input", () => {
      const input = {
        provider: "openai",
      };

      expect(() => validate(GenerateImageSchema, input)).toThrow(ValidationError);
    });
  });

  describe("validateSafe", () => {
    it("should return success for valid input", () => {
      const input = {
        prompt: "a cute cat",
      };

      const result = validateSafe(GenerateImageSchema, input);
      expect(result.success).toBe(true);
    });

    it("should return errors for invalid input", () => {
      const input = {
        provider: "openai",
      };

      const result = validateSafe(GenerateImageSchema, input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
