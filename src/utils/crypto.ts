import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derive encryption key from password + optional salt
 */
function deriveKey(password: string, salt?: Buffer): Buffer {
  const useSalt = salt || crypto.randomBytes(SALT_LENGTH);
  return crypto.pbkdf2Sync(password, useSalt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypt data with AES-256-GCM
 * Returns: base64(iv + salt + tag + encrypted)
 */
export function encrypt(plaintext: string, password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const tag = cipher.getAuthTag();

  // Combine: iv + salt + tag + encrypted
  const combined = Buffer.concat([iv, salt, tag, Buffer.from(encrypted, "base64")]);
  return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(encryptedData: string, password: string): string {
  const combined = Buffer.from(encryptedData, "base64");

  // Extract parts
  const iv = combined.subarray(0, IV_LENGTH);
  const salt = combined.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
  const tag = combined.subarray(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);

  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random DID (Decentralized Identifier)
 */
export function generateDID(): string {
  const randomBytes = crypto.randomBytes(16).toString("hex");
  return `did:memphis:${randomBytes}`;
}

/**
 * Verify if string is valid base64
 */
export function isBase64(str: string): boolean {
  try {
    return Buffer.from(str, "base64").toString("base64") === str;
  } catch {
    return false;
  }
}
