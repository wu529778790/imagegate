// Mock NextResponse before importing
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      body,
    })),
  },
}));

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ProviderError,
  createErrorResponse,
} from "../errors";

describe("Errors Library", () => {
  describe("AppError", () => {
    it("should create an error with default values", () => {
      const error = new AppError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.isOperational).toBe(true);
    });

    it("should create an error with custom values", () => {
      const error = new AppError("Test error", 400, "TEST_ERROR", false);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.isOperational).toBe(false);
    });
  });

  describe("ValidationError", () => {
    it("should create a validation error", () => {
      const error = new ValidationError("Invalid input", { field: "required" });

      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.fields).toEqual({ field: "required" });
    });
  });

  describe("AuthenticationError", () => {
    it("should create an authentication error with default message", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("should create an authentication error with custom message", () => {
      const error = new AuthenticationError("Token expired");

      expect(error.message).toBe("Token expired");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("AuthorizationError", () => {
    it("should create an authorization error with default message", () => {
      const error = new AuthorizationError();

      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("NotFoundError", () => {
    it("should create a not found error with default message", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  describe("RateLimitError", () => {
    it("should create a rate limit error with default message", () => {
      const error = new RateLimitError();

      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("ProviderError", () => {
    it("should create a provider error", () => {
      const error = new ProviderError("openai", "API key invalid", 401);

      expect(error.message).toBe("API key invalid");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("PROVIDER_ERROR");
      expect(error.provider).toBe("openai");
    });
  });

  describe("createErrorResponse", () => {
    it("should create response for operational error", () => {
      const error = new AppError("Test error", 400, "TEST_ERROR");
      const response = createErrorResponse(error);

      expect(response.status).toBe(400);
    });

    it("should create response for unknown error", () => {
      const error = new Error("Unknown error");
      const response = createErrorResponse(error);

      expect(response.status).toBe(500);
    });

    it("should create response with context", () => {
      const error = new AppError("Test error");
      const response = createErrorResponse(error, "TestContext");

      expect(response.status).toBe(500);
    });
  });
});
