import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { hashToken, generateSessionToken } from "../src/lib/auth/session";

describe("Authentication & Cryptographic Utilities", () => {
  it("should securely hash passwords and verify them correctly", async () => {
    const rawPassword = "SuperSecurePassword123!";
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(rawPassword);

    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isWrongValid = await verifyPassword("WrongPassword456!", hash);
    expect(isWrongValid).toBe(false);
  });

  it("should generate random session tokens and compute deterministic SHA-256 hashes", () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64); // 32 bytes hex = 64 chars

    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toHaveLength(64);
    expect(hash1).toEqual(hash2);

    const tokenB = generateSessionToken();
    expect(hashToken(tokenB)).not.toEqual(hash1);
  });
});

