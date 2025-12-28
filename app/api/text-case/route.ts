import { NextResponse } from "next/server";

type CaseType =
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "title"
  | "upper"
  | "lower"
  | "sentence"
  | "capitalized"
  | "constant"
  | "dot"
  | "path"
  | "train"
  | "sentence-kebab"
  | "studly";

type ConverterOptions = {
  preserveAcronyms?: boolean;
  smartNumbers?: boolean;
  extraDelimiters?: boolean;
  keepPunctuation?: boolean;
  locale?: string;
  perLine?: boolean;
};

type Token = {
  type: "word" | "delimiter";
  value: string;
  isSeparator: boolean;
};

const caseOrder: CaseType[] = [
  "camel",
  "pascal",
  "studly",
  "snake",
  "constant",
  "kebab",
  "train",
  "dot",
  "path",
  "title",
  "sentence",
  "sentence-kebab",
  "capitalized",
  "upper",
  "lower",
];

const localeLower = (value: string, locale: string) => value.toLocaleLowerCase(locale);
const localeUpper = (value: string, locale: string) => value.toLocaleUpperCase(locale);

const isLetter = (char: string) => /\p{L}/u.test(char);
const isDigit = (char: string) => /[0-9]/.test(char);
const isSoftDelimiter = (char: string) => char === "." || char === "/" || char === ":";

const isSeparatorChar = (char: string, options: Required<ConverterOptions>) =>
  char === "_" || char === "-" || /\s/.test(char) || (options.extraDelimiters && isSoftDelimiter(char));

const isWordChar = (char: string, options: Required<ConverterOptions>) =>
  isLetter(char) || isDigit(char) || (!options.extraDelimiters && isSoftDelimiter(char));

const tokenize = (text: string, options: Required<ConverterOptions>): Token[] => {
  const tokens: Token[] = [];
  let current = "";
  let currentType: "letter" | "digit" | "other" | null = null;

  const flush = () => {
    if (current) {
      tokens.push({ type: "word", value: current, isSeparator: false });
      current = "";
      currentType = null;
    }
  };

  for (const char of text) {
    if (isWordChar(char, options)) {
      const nextType = isLetter(char) ? "letter" : isDigit(char) ? "digit" : "other";
      if (
        options.smartNumbers &&
        current &&
        ((currentType === "letter" && nextType === "digit") || (currentType === "digit" && nextType === "letter"))
      ) {
        flush();
      }
      current += char;
      currentType = nextType;
    } else {
      flush();
      tokens.push({ type: "delimiter", value: char, isSeparator: isSeparatorChar(char, options) });
    }
  }
  flush();
  return tokens;
};

const getLetters = (value: string) => value.match(/\p{L}+/gu)?.join("") ?? "";

const isAcronymToken = (value: string, locale: string) => {
  const letters = getLetters(value);
  if (letters.length < 2) return false;
  return letters === letters.toLocaleUpperCase(locale);
};

const capitalizeWord = (value: string, locale: string) => {
  let result = "";
  let upperNext = true;
  for (const char of value) {
    if (isLetter(char)) {
      result += upperNext ? char.toLocaleUpperCase(locale) : char.toLocaleLowerCase(locale);
      upperNext = false;
    } else {
      result += char;
    }
  }
  return result;
};

const toStudly = (value: string, locale: string) => {
  let result = "";
  let upperNext = true;
  for (const char of value) {
    if (isLetter(char)) {
      result += upperNext ? char.toLocaleUpperCase(locale) : char.toLocaleLowerCase(locale);
      upperNext = !upperNext;
    } else {
      result += char;
    }
  }
  return result;
};

const buildWordInfos = (tokens: Token[], options: Required<ConverterOptions>) =>
  tokens
    .filter((token) => token.type === "word")
    .map((token) => ({
      value: token.value,
      isAcronym: options.preserveAcronyms && isAcronymToken(token.value, options.locale),
    }));

const getJoiner = (caseType: CaseType) => {
  switch (caseType) {
    case "snake":
    case "constant":
      return "_";
    case "kebab":
    case "train":
    case "sentence-kebab":
      return "-";
    case "dot":
      return ".";
    case "path":
      return "/";
    case "title":
    case "capitalized":
    case "sentence":
      return " ";
    default:
      return "";
  }
};

const convertWords = (words: ReturnType<typeof buildWordInfos>, caseType: CaseType, options: Required<ConverterOptions>) => {
  const lower = (value: string) => localeLower(value, options.locale);
  const upper = (value: string) => localeUpper(value, options.locale);
  const lowerPreserve = (word: { value: string; isAcronym: boolean }) =>
    word.isAcronym ? upper(word.value) : lower(word.value);
  const capitalized = (word: { value: string; isAcronym: boolean }) =>
    word.isAcronym ? upper(word.value) : capitalizeWord(word.value, options.locale);

  switch (caseType) {
    case "camel":
      return words.map((word, index) => {
        if (index === 0) {
          return word.isAcronym ? upper(word.value) : lower(word.value);
        }
        return word.isAcronym ? upper(word.value) : capitalized(word);
      });
    case "pascal":
      return words.map((word) => (word.isAcronym ? upper(word.value) : capitalized(word)));
    case "studly": {
      const base = words.map((word) => (word.isAcronym ? upper(word.value) : capitalized(word))).join("");
      return [toStudly(base, options.locale)];
    }
    case "snake":
    case "kebab":
    case "dot":
    case "path":
      return words.map((word) => lowerPreserve(word));
    case "constant":
      return words.map((word) => upper(word.value));
    case "train":
      return words.map((word) => capitalized(word));
    case "sentence-kebab":
    case "sentence":
      return words.map((word, index) => {
        if (index === 0) {
          return word.isAcronym ? upper(word.value) : capitalized(word);
        }
        return lowerPreserve(word);
      });
    case "title":
    case "capitalized":
      return words.map((word) => capitalized(word));
    default:
      return words.map((word) => word.value);
  }
};

const convertText = (text: string, caseType: CaseType, options: Required<ConverterOptions>) => {
  if (!text) return "";
  if (caseType === "upper") {
    return localeUpper(text, options.locale);
  }
  if (caseType === "lower") {
    return localeLower(text, options.locale);
  }
  if (caseType === "studly" && options.keepPunctuation) {
    return toStudly(text, options.locale);
  }

  const tokens = tokenize(text, options);
  const words = buildWordInfos(tokens, options);
  if (!words.length) {
    return text;
  }

  const convertedWords = convertWords(words, caseType, options);
  const joiner = getJoiner(caseType);

  if (caseType === "studly") {
    return convertedWords[0] ?? "";
  }

  if (!options.keepPunctuation) {
    return joiner ? convertedWords.join(joiner) : convertedWords.join("");
  }

  let output = "";
  let wordIndex = 0;
  for (const token of tokens) {
    if (token.type === "word") {
      output += convertedWords[wordIndex] ?? "";
      wordIndex += 1;
      continue;
    }
    if (token.isSeparator) {
      if (joiner) {
        output += joiner;
      }
    } else {
      output += token.value;
    }
  }
  return output;
};

const convertTextWithLineMode = (text: string, caseType: CaseType, options: Required<ConverterOptions>) => {
  if (!options.perLine) {
    return convertText(text, caseType, options);
  }
  return text
    .split(/\n/)
    .map((line) => convertText(line, caseType, options))
    .join("\n");
};

export async function POST(request: Request) {
  if (process.env.TEXT_CASE_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Text case API is disabled." }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const text = String(body?.input ?? "");
  const requestedCase = body?.case as CaseType | undefined;
  const keys = requestedCase && caseOrder.includes(requestedCase) ? [requestedCase] : caseOrder;

  const options: Required<ConverterOptions> = {
    preserveAcronyms: Boolean(body?.options?.preserveAcronyms ?? true),
    smartNumbers: Boolean(body?.options?.smartNumbers ?? true),
    extraDelimiters: Boolean(body?.options?.extraDelimiters ?? false),
    keepPunctuation: Boolean(body?.options?.keepPunctuation ?? false),
    locale: String(body?.options?.locale ?? "en"),
    perLine: Boolean(body?.options?.perLine ?? false),
  };

  const outputs = keys.map((key) => [key, convertTextWithLineMode(text, key, options)] as const);

  return NextResponse.json({
    input: text,
    options,
    outputs: Object.fromEntries(outputs),
  });
}
