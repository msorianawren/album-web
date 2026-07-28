import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { metaConfig } from "@/lib/meta/config";

export class TokenVaultError extends Error {}

function resolveKey() {
  const raw = metaConfig.tokenEncryptionKey;
  const key = /^[a-f0-9]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new TokenVaultError("META_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  return key;
}

export function encryptMetaToken(token: string) {
  if (!token || token.length > 10_000) throw new TokenVaultError("Invalid token payload.");
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptMetaToken(ciphertext: string) {
  const parts = ciphertext.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new TokenVaultError("Invalid encrypted token.");
  try {
    const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) throw new Error("Malformed token.");
    const decipher = createDecipheriv("aes-256-gcm", resolveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new TokenVaultError("Unable to decrypt Meta token.");
  }
}
