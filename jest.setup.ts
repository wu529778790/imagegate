import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Mock Next.js headers
jest.mock("next/headers", () => ({
  headers: () => ({
    get: jest.fn(),
  }),
  cookies: () => ({
    get: jest.fn(),
  }),
}));

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      body,
    })),
  },
}));

// Mock environment variables
process.env = {
  ...process.env,
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "test-client-id",
  GITHUB_CLIENT_SECRET: "test-client-secret",
  ENCRYPTION_SECRET: "test-encryption-secret",
};
