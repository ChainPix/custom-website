import { describe, expect, it } from "vitest";
import {
  bytesToBase64,
  bytesToBase64Url,
  bytesToHex,
  hashText,
  hmacText,
} from "@/app/(tools)/hash-generator/hashing";

describe("hashText — NIST test vectors", () => {
  it("SHA-256 of 'abc'", async () => {
    const bytes = await hashText("abc", "SHA-256");
    expect(bytesToHex(bytes, "lowercase")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("SHA-1 of 'abc'", async () => {
    const bytes = await hashText("abc", "SHA-1");
    expect(bytesToHex(bytes, "lowercase")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("SHA-512 of 'abc'", async () => {
    const bytes = await hashText("abc", "SHA-512");
    expect(bytesToHex(bytes, "lowercase")).toBe(
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
        "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
    );
  });
});

describe("hmacText", () => {
  it("matches the classic HMAC-SHA256 quick-brown-fox vector", async () => {
    const bytes = await hmacText("The quick brown fox jumps over the lazy dog", "key", "SHA-256");
    expect(bytesToHex(bytes, "lowercase")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
    );
  });
});

describe("output encodings", () => {
  it("hex casing follows the option", async () => {
    const bytes = await hashText("abc", "SHA-1");
    expect(bytesToHex(bytes, "uppercase")).toBe("A9993E364706816ABA3E25717850C26C9CD0D89D");
  });

  it("base64url replaces +/ and strips padding", () => {
    const bytes = new Uint8Array([251, 255, 190]); // encodes to "+/++" family chars
    const b64 = bytesToBase64(bytes);
    const url = bytesToBase64Url(bytes);
    expect(b64.endsWith("=") || b64.length % 4 === 0).toBe(true);
    expect(url).not.toMatch(/[+/=]/);
  });
});
