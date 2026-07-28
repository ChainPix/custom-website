import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  decodeBase64ToText,
  decodeBytesToText,
  encodeTextToBase64,
  toBase64Url,
} from "@/app/(tools)/base64-encoder/codec";

describe("text round-trip", () => {
  it("encodes and decodes ascii and unicode", () => {
    expect(encodeTextToBase64("hi", "standard")).toBe("aGk=");
    const text = "héllo ✓ 日本語 🎉";
    expect(decodeBase64ToText(encodeTextToBase64(text, "standard"))).toBe(text);
  });

  it("produces url-safe output without padding in url variant", () => {
    const encoded = encodeTextToBase64("??>>~~\xff", "url");
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe("chunked byte codecs", () => {
  it("round-trips payloads larger than one 32KB chunk", () => {
    const bytes = new Uint8Array(100_000);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256;
    const base64 = bytesToBase64(bytes);
    expect(base64ToBytes(base64)).toEqual(bytes);
  });

  it("reports monotonically increasing progress ending at 1", () => {
    const bytes = new Uint8Array(70_000);
    const seen: number[] = [];
    bytesToBase64(bytes, (p) => seen.push(p));
    expect(seen.length).toBeGreaterThan(1);
    expect(Math.max(...seen)).toBe(1);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it("throws on invalid base64 input", () => {
    expect(() => base64ToBytes("not base64!!")).toThrow();
  });
});

describe("decodeBytesToText", () => {
  it("decodes valid utf-8 strictly and falls back on invalid sequences", () => {
    expect(decodeBytesToText(new TextEncoder().encode("ok"))).toBe("ok");
    // 0xFF is never valid UTF-8 — strict decoder throws, fallback replaces.
    expect(decodeBytesToText(new Uint8Array([0xff]))).toBe("�");
  });
});

describe("toBase64Url", () => {
  it("maps +/ to -_ and strips padding", () => {
    expect(toBase64Url("a+b/c==")).toBe("a-b_c");
  });
});
