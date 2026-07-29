import { describe, expect, it } from "vitest";
import {
  decodeBase64Url,
  decodeSegment,
  pemToArrayBuffer,
  toArrayBuffer,
} from "@/app/(tools)/jwt-decoder/decode";

// Header + payload of the classic example token (jwt.io):
// {"alg":"HS256","typ":"JWT"} . {"sub":"1234567890","name":"John Doe","iat":1516239022}
const HEADER_SEGMENT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const PAYLOAD_SEGMENT = "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ";

describe("decodeSegment", () => {
  it("decodes the standard example header", () => {
    expect(decodeSegment(HEADER_SEGMENT)).toEqual({
      value: { alg: "HS256", typ: "JWT" },
    });
  });

  it("decodes an unpadded payload segment (base64url, no '=')", () => {
    const result = decodeSegment(PAYLOAD_SEGMENT);
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
  });

  it("reports invalid base64url input", () => {
    const result = decodeSegment("!!!not-base64!!!");
    expect(result.value).toBeNull();
    expect(result.error).toBe("Invalid base64url segment.");
  });

  it("reports valid base64 that is not JSON", () => {
    const notJson = Buffer.from("plain text").toString("base64url");
    const result = decodeSegment(notJson);
    expect(result.value).toBeNull();
    expect(result.error).toBe("Invalid JSON in decoded segment.");
  });
});

describe("decodeBase64Url", () => {
  it("handles '-' and '_' characters and missing padding", () => {
    const bytes = decodeBase64Url("_-8"); // 0xff 0xef
    expect(Array.from(bytes)).toEqual([255, 239]);
  });
});

describe("pemToArrayBuffer / toArrayBuffer", () => {
  it("strips PEM armor and whitespace before decoding", () => {
    const raw = Buffer.from([1, 2, 3, 4]).toString("base64");
    const pem = `-----BEGIN PUBLIC KEY-----\n${raw}\n-----END PUBLIC KEY-----`;
    const buffer = pemToArrayBuffer(pem);
    expect(Array.from(new Uint8Array(buffer))).toEqual([1, 2, 3, 4]);
  });

  it("copies bytes into a standalone ArrayBuffer", () => {
    const bytes = new Uint8Array([9, 8, 7]);
    const buffer = toArrayBuffer(bytes);
    expect(buffer.byteLength).toBe(3);
    expect(Array.from(new Uint8Array(buffer))).toEqual([9, 8, 7]);
  });
});
