import { describe, expect, it } from "vitest";
import {
  base64ToText,
  buildLineDiff,
  estimateBase64Bytes,
  formatBytes,
  fromBase64Url,
  getPayloadFromOutput,
  parseDataUri,
  textToBase64,
  toBase64Url,
} from "@/app/(tools)/data-uri/encoding";

describe("base64 round-trip", () => {
  it("encodes and decodes unicode text", () => {
    const text = "héllo wörld ✓ 日本語";
    expect(base64ToText(textToBase64(text), false)).toBe(text);
  });

  it("converts to and from base64url", () => {
    const base64 = textToBase64("??>>~~"); // produces + and / in base64
    const url = toBase64Url(base64);
    expect(url).not.toMatch(/[+/=]/);
    expect(fromBase64Url(url)).toBe(base64);
  });
});

describe("parseDataUri", () => {
  it("extracts mime, charset and base64 flag from a full data URI", () => {
    const uri = `data:text/plain;charset=utf-8;base64,${textToBase64("hi")}`;
    const parsed = parseDataUri(uri, false, false);
    expect(parsed.mimeType).toBe("text/plain");
    expect(parsed.charset).toBe("utf-8");
    expect(parsed.isBase64).toBe(true);
    expect(parsed.decodedBytes).toBe(2);
  });

  it("defaults to text/plain when the header has no mime", () => {
    const parsed = parseDataUri("data:;base64,aGk=", false, false);
    expect(parsed.mimeType).toBe("text/plain");
    expect(parsed.isBase64).toBe(true);
  });

  it("treats non-data-URI input as payload only", () => {
    const parsed = parseDataUri("aGk=", true, false);
    expect(parsed.mimeType).toBe("payload only");
    expect(parsed.decodedBytes).toBe(2);
  });

  it("returns the empty shape for empty input", () => {
    expect(parseDataUri("", false, false).mimeType).toBe("n/a");
  });
});

describe("getPayloadFromOutput", () => {
  it("splits header and payload of a data URI", () => {
    expect(getPayloadFromOutput("data:text/plain;base64,aGk=", false)).toEqual({
      payload: "aGk=",
      isBase64: true,
    });
  });

  it("respects assumeBase64 for bare payloads", () => {
    expect(getPayloadFromOutput("aGk=", true).isBase64).toBe(true);
    expect(getPayloadFromOutput("hello", false).isBase64).toBe(false);
  });
});

describe("estimateBase64Bytes", () => {
  it("accounts for padding", () => {
    expect(estimateBase64Bytes("aGk=", false)).toBe(2); // "hi"
    expect(estimateBase64Bytes("aGV5", false)).toBe(3); // "hey"
  });
});

describe("formatBytes", () => {
  it("scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("buildLineDiff", () => {
  it("marks unchanged, added and removed lines via LCS", () => {
    const diff = buildLineDiff("a\nb\nc", "a\nc\nd");
    expect(diff).toEqual([
      { type: "same", text: "a" },
      { type: "remove", text: "b" },
      { type: "same", text: "c" },
      { type: "add", text: "d" },
    ]);
  });
});
