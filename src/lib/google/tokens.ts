import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM at-rest encryption for Google OAuth refresh/access tokens
 * (spec §7.5). TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).
 * Server-only — never import this from a Client Component.
 */
function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/** Returns `iv:authTag:ciphertext`, each base64, colon-joined for storage in a single text column. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptToken(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted token payload");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
