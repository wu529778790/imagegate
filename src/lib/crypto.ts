/**
 * Encryption utility for sensitive data (API keys, tokens).
 * Uses AES-256-GCM for encryption.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable.
 * Falls back to a default key for development (NOT for production!)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || "default-dev-secret-change-in-production-12345678901234567890";

  // Derive a 256-bit key using PBKDF2
  const salt = Buffer.from("imagegate-salt-v1", "utf8");
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha512");
}

/**
 * Encrypt a string value
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const [ivHex, tagHex, encrypted] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string is encrypted (has the iv:tag:data format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/.test(p));
}

/**
 * Encrypt a value if it's not already encrypted
 */
export function encryptIfNeeded(value: string): string {
  if (isEncrypted(value)) {
    return value; // Already encrypted
  }
  return encrypt(value);
}

/**
 * Decrypt a value if it's encrypted, otherwise return as-is
 */
export function decryptIfNeeded(value: string): string {
  if (isEncrypted(value)) {
    return decrypt(value);
  }
  return value; // Not encrypted (legacy data)
}

/**
 * Generate a random encryption secret
 */
export function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}
