import crypto from "crypto";

/**
 * Hashes a plaintext password using PBKDF2 with SHA-512 and a cryptographically secure random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored combined salt:hash string.
 * Also supports legacy plain text passwords during initial development migration.
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!password || !combinedHash) return false;

  // If not formatted as salt:hash, compare directly (legacy/initial seed fallback)
  if (!combinedHash.includes(":")) {
    return password === combinedHash;
  }

  const [salt, hash] = combinedHash.split(":");
  if (!salt || !hash) return false;

  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}
