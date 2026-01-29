// Token generation and validation for repair approvals
// Tokens are URL-safe, 48h expiry, stored as SHA-256 hash

import { createHash, randomBytes } from "crypto";

const TOKEN_EXPIRY_HOURS = 48;

/**
 * Generates a secure random token for repair approval links
 * Returns both the raw token (for the URL) and the hash (for storage)
 */
export function generateApprovalToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  // 32 bytes = 256 bits of entropy, URL-safe base64
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  return { token, tokenHash, expiresAt };
}

/**
 * Hash a token using SHA-256
 * We store the hash, never the raw token
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Validate a token against a stored hash and expiry
 */
export function validateToken(
  token: string,
  storedHash: string,
  expiresAt: Date
): { valid: boolean; reason?: string } {
  // Check expiry first
  if (new Date() > expiresAt) {
    return { valid: false, reason: "Token expirado" };
  }

  // Check hash matches
  const providedHash = hashToken(token);
  if (providedHash !== storedHash) {
    return { valid: false, reason: "Token inválido" };
  }

  return { valid: true };
}

/**
 * Build the approval URL for a repair
 */
export function buildApprovalUrl(itemId: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mrapple-tech-transfers.vercel.app";
  return `${baseUrl}/r/${itemId}?t=${token}`;
}
