import { describe, expect, it } from "vitest";
import {
  base64ToBlob,
  base64ToBytes,
  guessExtension,
  parseDataUrl,
  stripPrefix,
} from "@/app/(tools)/image-base64/helpers";

describe("parseDataUrl", () => {
  it("extracts mime and payload from a base64 data URL", () => {
    expect(parseDataUrl("data:image/png;base64,AAAA")).toEqual({
      mime: "image/png",
      payload: "AAAA",
    });
  });

  it("defaults the mime when missing", () => {
    expect(parseDataUrl("data:;base64,AAAA")?.mime).toBe("application/octet-stream");
  });

  it("rejects non-data URLs and non-base64 data URLs", () => {
    expect(parseDataUrl("AAAA")).toBeNull();
    expect(parseDataUrl("data:text/plain,hello")).toBeNull();
    expect(parseDataUrl("data:image/png;base64")).toBeNull();
  });
});

describe("stripPrefix", () => {
  it("removes the data-URL header but leaves bare payloads alone", () => {
    expect(stripPrefix("data:image/png;base64,AAAA")).toBe("AAAA");
    expect(stripPrefix("AAAA")).toBe("AAAA");
  });
});

describe("base64ToBytes / base64ToBlob", () => {
  it("decodes to the original bytes", () => {
    expect(Array.from(base64ToBytes("aGk="))).toEqual([104, 105]); // "hi"
  });

  it("builds a blob with the requested mime and size", () => {
    const blob = base64ToBlob("aGk=", "image/png");
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(2);
  });
});

describe("guessExtension", () => {
  it("maps common image mimes and is case-insensitive", () => {
    expect(guessExtension("image/jpeg")).toBe("jpg");
    expect(guessExtension("IMAGE/PNG")).toBe("png");
    expect(guessExtension("image/svg+xml")).toBe("svg");
  });

  it("returns empty for unknown mimes", () => {
    expect(guessExtension("application/pdf")).toBe("");
  });
});
