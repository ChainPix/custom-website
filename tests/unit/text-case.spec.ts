import { describe, expect, it } from "vitest";
import {
  convertText,
  convertTextWithLineMode,
  isAcronymToken,
  toStudly,
  type ConverterOptions,
} from "@/app/(tools)/text-case/convert";

const opts = (over: Partial<ConverterOptions> = {}): ConverterOptions => ({
  preserveAcronyms: false,
  smartNumbers: false,
  extraDelimiters: false,
  keepPunctuation: false,
  locale: "en-US",
  perLine: false,
  ...over,
});

describe("convertText — core cases", () => {
  const input = "hello world example";

  it("camel / pascal / snake / kebab / constant", () => {
    expect(convertText(input, "camel", opts())).toBe("helloWorldExample");
    expect(convertText(input, "pascal", opts())).toBe("HelloWorldExample");
    expect(convertText(input, "snake", opts())).toBe("hello_world_example");
    expect(convertText(input, "kebab", opts())).toBe("hello-world-example");
    expect(convertText(input, "constant", opts())).toBe("HELLO_WORLD_EXAMPLE");
  });

  it("title / sentence / dot / path / train", () => {
    expect(convertText(input, "title", opts())).toBe("Hello World Example");
    expect(convertText("hello world", "sentence", opts())).toBe("Hello world");
    expect(convertText(input, "dot", opts())).toBe("hello.world.example");
    expect(convertText(input, "path", opts())).toBe("hello/world/example");
    expect(convertText(input, "train", opts())).toBe("Hello-World-Example");
  });

  it("splits existing camelCase and snake_case input into words", () => {
    expect(convertText("someVariableName", "snake", opts())).toBe("somevariablename");
    expect(convertText("some_variable_name", "camel", opts())).toBe("someVariableName");
  });

  it("upper/lower are locale transforms of the whole text", () => {
    expect(convertText("Hello, World!", "upper", opts())).toBe("HELLO, WORLD!");
    expect(convertText("Hello, World!", "lower", opts())).toBe("hello, world!");
  });
});

describe("options", () => {
  it("preserveAcronyms keeps API uppercase in camel", () => {
    expect(convertText("fetch API data", "camel", opts({ preserveAcronyms: true }))).toBe("fetchAPIData");
    expect(convertText("fetch API data", "camel", opts())).toBe("fetchApiData");
  });

  it("smartNumbers splits letter-digit boundaries", () => {
    expect(convertText("version2update", "snake", opts({ smartNumbers: true }))).toBe("version_2_update");
    expect(convertText("version2update", "snake", opts())).toBe("version2update");
  });

  it("extraDelimiters treats dots as separators", () => {
    expect(convertText("a.b.c", "camel", opts({ extraDelimiters: true }))).toBe("aBC");
  });

  it("keepPunctuation retains non-separator characters", () => {
    expect(convertText("hello, world", "snake", opts({ keepPunctuation: true }))).toBe("hello,_world");
  });

  it("perLine converts each line independently", () => {
    expect(convertTextWithLineMode("one two\nthree four", "pascal", opts({ perLine: true }))).toBe(
      "OneTwo\nThreeFour"
    );
  });
});

describe("helpers", () => {
  it("isAcronymToken requires 2+ uppercase letters", () => {
    expect(isAcronymToken("API", "en-US")).toBe(true);
    expect(isAcronymToken("A", "en-US")).toBe(false);
    expect(isAcronymToken("Api", "en-US")).toBe(false);
  });

  it("toStudly alternates letter casing, skipping non-letters", () => {
    expect(toStudly("abcd", "en-US")).toBe("AbCd");
    expect(toStudly("a b", "en-US")).toBe("A b");
  });
});
