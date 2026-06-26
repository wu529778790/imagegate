import { encrypt, decrypt, isEncrypted, encryptIfNeeded, decryptIfNeeded } from "../crypto";

describe("Crypto Library", () => {
  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const plaintext = "test-api-key-12345";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const plaintext = "test-api-key";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty string", () => {
      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "sk-1234567890!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", () => {
      const plaintext = "a".repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted strings", () => {
      const encrypted = encrypt("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plain strings", () => {
      expect(isEncrypted("test-api-key")).toBe(false);
    });

    it("should return false for empty strings", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("should return false for strings with wrong format", () => {
      expect(isEncrypted("abc:def")).toBe(false);
      expect(isEncrypted("abc:def:ghi:jkl")).toBe(false);
    });
  });

  describe("encryptIfNeeded", () => {
    it("should encrypt unencrypted strings", () => {
      const plaintext = "test-api-key";
      const result = encryptIfNeeded(plaintext);

      expect(isEncrypted(result)).toBe(true);
      expect(decrypt(result)).toBe(plaintext);
    });

    it("should not encrypt already encrypted strings", () => {
      const plaintext = "test-api-key";
      const encrypted = encrypt(plaintext);
      const result = encryptIfNeeded(encrypted);

      expect(result).toBe(encrypted);
    });
  });

  describe("decryptIfNeeded", () => {
    it("should decrypt encrypted strings", () => {
      const plaintext = "test-api-key";
      const encrypted = encrypt(plaintext);
      const result = decryptIfNeeded(encrypted);

      expect(result).toBe(plaintext);
    });

    it("should return unencrypted strings as-is", () => {
      const plaintext = "test-api-key";
      const result = decryptIfNeeded(plaintext);

      expect(result).toBe(plaintext);
    });
  });
});
