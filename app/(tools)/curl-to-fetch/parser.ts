export type ParseResult = {
  url: string;
  method: string;
  headers: Array<{ name: string; value: string }>;
  body?: string;
  dataFile?: string;
  form?: Array<{ name: string; value: string; isFile: boolean }>;
  urlEncoded?: Array<{ name: string; value: string; isFile: boolean }>;
  ignored: string[];
  warnings: string[];
};

export type OutputTarget = "fetch-browser" | "fetch-node" | "axios" | "python-requests" | "go-http";
export type ResponseMode = "auto" | "json" | "text";
export type SnippetLanguage = "js" | "ts";
export type SnippetVariant = "standard" | "minimal" | "production";

export type Options = {
  wrapAsync: boolean;
  prettyOptions: boolean;
  target: OutputTarget;
  responseMode: ResponseMode;
  typescript: boolean;
  useSatisfies: boolean;
};

export function tokenize(command: string) {
  const tokens: string[] = [];
  let current = "";
  const normalized = command.replace(/\\\r?\n/g, " ").replace(/\^\r?\n/g, " ");
  const flush = () => {
    if (current) {
      tokens.push(current);
      current = "";
    }
  };

  const readAnsiEscape = (input: string, start: number) => {
    const code = input[start];
    if (!code) return { value: "", offset: 0 };
    if (code === "n") return { value: "\n", offset: 1 };
    if (code === "r") return { value: "\r", offset: 1 };
    if (code === "t") return { value: "\t", offset: 1 };
    if (code === "b") return { value: "\b", offset: 1 };
    if (code === "f") return { value: "\f", offset: 1 };
    if (code === "v") return { value: "\v", offset: 1 };
    if (code === "\\") return { value: "\\", offset: 1 };
    if (code === "'") return { value: "'", offset: 1 };
    if (code === '"') return { value: '"', offset: 1 };
    if (code === "x") {
      const hex = input.slice(start + 1, start + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        return { value: String.fromCharCode(parseInt(hex, 16)), offset: 3 };
      }
    }
    if (code === "u") {
      const hex = input.slice(start + 1, start + 5);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        return { value: String.fromCharCode(parseInt(hex, 16)), offset: 5 };
      }
    }
    return { value: code, offset: 1 };
  };

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === "$" && next === "'") {
      i += 2;
      for (; i < normalized.length; i++) {
        const inner = normalized[i];
        if (inner === "'") break;
        if (inner === "\\") {
          const parsed = readAnsiEscape(normalized, i + 1);
          current += parsed.value;
          i += parsed.offset;
          continue;
        }
        current += inner;
      }
      continue;
    }

    if (char === "'") {
      i += 1;
      for (; i < normalized.length; i++) {
        if (normalized[i] === "'") break;
        current += normalized[i];
      }
      continue;
    }

    if (char === '"') {
      i += 1;
      for (; i < normalized.length; i++) {
        const inner = normalized[i];
        const lookahead = normalized[i + 1];
        if (inner === '"') {
          if (lookahead === '"') {
            current += '"';
            i += 1;
            continue;
          }
          break;
        }
        if (inner === "\\" && lookahead) {
          current += lookahead;
          i += 1;
          continue;
        }
        if (inner === "^" && lookahead) {
          current += lookahead;
          i += 1;
          continue;
        }
        current += inner;
      }
      continue;
    }

    if (char === "\\") {
      if (next) {
        current += next;
        i += 1;
      }
      continue;
    }

    if (char === "^") {
      if (next) {
        current += next;
        i += 1;
      }
      continue;
    }

    if (/\s/.test(char)) {
      flush();
      continue;
    }

    current += char;
  }

  flush();
  return tokens;
}

export function parseCurl(command: string): ParseResult {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("Enter a cURL command.");
  if (trimmed.length > 8000) throw new Error("Command is too long. Please shorten it.");

  const tokens = tokenize(trimmed);
  if (!tokens.length) throw new Error("Nothing to parse.");
  if (tokens[0].toLowerCase() === "curl") tokens.shift();

  let url = "";
  let method: string | undefined;
  const headers: Array<{ name: string; value: string }> = [];
  let body: string | undefined;
  let dataFile: string | undefined;
  const dataParts: string[] = [];
  const form: Array<{ name: string; value: string; isFile: boolean }> = [];
  const urlEncoded: Array<{ name: string; value: string; isFile: boolean }> = [];
  const ignored: string[] = [];
  const warnings: string[] = [];
  const urlCandidates: string[] = [];
  let useGet = false;
  let compressed = false;

  const addHeader = (value: string) => {
    const lines = value.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const splitIndex = line.indexOf(":");
      if (splitIndex === -1) {
        warnings.push(`Header "${line}" is missing ":".`);
        continue;
      }
      const name = line.slice(0, splitIndex).trim();
      const headerValue = line.slice(splitIndex + 1).trim();
      if (name) {
        headers.push({ name, value: headerValue });
      }
    }
  };

  const appendForm = (value: string) => {
    const splitIndex = value.indexOf("=");
    if (splitIndex === -1) {
      warnings.push(`Form field "${value}" is missing "=".`);
      return;
    }
    const name = value.slice(0, splitIndex);
    let fieldValue = value.slice(splitIndex + 1);
    let isFile = false;
    if (fieldValue.startsWith("@@")) {
      fieldValue = fieldValue.slice(1);
    } else if (fieldValue.startsWith("@")) {
      isFile = true;
      fieldValue = fieldValue.slice(1);
      warnings.push(`Form file "${name}" uses @${fieldValue}; replace placeholder with a Blob/File.`);
    }
    form.push({ name, value: fieldValue, isFile });
  };

  const appendUrlEncoded = (value: string) => {
    const splitIndex = value.indexOf("=");
    const name = splitIndex === -1 ? value : value.slice(0, splitIndex);
    let fieldValue = splitIndex === -1 ? "" : value.slice(splitIndex + 1);
    let isFile = false;
    if (fieldValue.startsWith("@@")) {
      fieldValue = fieldValue.slice(1);
    } else if (fieldValue.startsWith("@")) {
      isFile = true;
      fieldValue = fieldValue.slice(1);
      warnings.push(`URL-encoded data "${name}" uses @${fieldValue}; replace placeholder with file contents.`);
    }
    urlEncoded.push({ name, value: fieldValue, isFile });
  };

  const isUrlCandidate = (value: string) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return true;
    if (/^localhost(?::\d+)?(\/|$)/i.test(value)) return true;
    if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?(\/|$)/i.test(value)) return true;
    if (/^[\w.-]+:\d+(\/|$)/.test(value)) return true;
    return false;
  };

  const appendQuery = (base: string, query: string) => {
    if (!query) return base;
    const [path, hash] = base.split("#");
    const joiner = path.includes("?") ? "&" : "?";
    const joined = `${path}${joiner}${query}`;
    return hash ? `${joined}#${hash}` : joined;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (t === "--compressed") {
      compressed = true;
      continue;
    }
    if (t === "-L" || t === "--location") {
      warnings.push("Redirects enabled (-L/--location); fetch follows redirects by default.");
      continue;
    }
    if (t === "-G" || t === "--get") {
      useGet = true;
      continue;
    }
    if (t === "-X" || t === "--request" || t === "--method") {
      if (next) {
        method = next.toUpperCase();
        i++;
      }
      continue;
    }
    if (t === "-I" || t === "--head") {
      method = "HEAD";
      continue;
    }
    if (t === "-H" || t === "--header") {
      if (next) {
        addHeader(next);
        i++;
      }
      continue;
    }
    if (t === "--url") {
      if (next) {
        url = next;
        i++;
      }
      continue;
    }
    if (t === "--request-target") {
      if (next) {
        warnings.push(`--request-target "${next}" is not supported in fetch.`);
        i++;
      }
      continue;
    }
    if (t === "-b" || t === "--cookie") {
      if (next) {
        if (next.startsWith("@") && !next.startsWith("@@")) {
          const cookieFile = next.slice(1);
          warnings.push(`Cookie file @${cookieFile} detected; replace with "name=value" pairs.`);
        } else {
          const cookieValue = next.startsWith("@@") ? next.slice(1) : next;
          addHeader(`Cookie: ${cookieValue}`);
        }
        i++;
      }
      continue;
    }
    if (t === "-c" || t === "--cookie-jar") {
      if (next) {
        warnings.push(`Cookie jar "${next}" is not supported in browser fetch.`);
        i++;
      }
      continue;
    }
    if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      if (next !== undefined) {
        if (next.startsWith("@") && !next.startsWith("@@")) {
          dataFile = next.slice(1);
          warnings.push(`Body uses @${dataFile}; replace placeholder with file contents.`);
        } else {
          const normalized = next.startsWith("@@") ? next.slice(1) : next;
          dataParts.push(normalized);
        }
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "--data-urlencode") {
      if (next !== undefined) {
        appendUrlEncoded(next);
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "-F" || t === "--form" || t === "--form-string") {
      if (next !== undefined) {
        appendForm(next);
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "-u" || t === "--user") {
      if (next) {
        try {
          headers.push({ name: "Authorization", value: `Basic ${btoa(next)}` });
        } catch {
          headers.push({ name: "Authorization", value: `Basic ${next}` });
        }
        i++;
      }
      continue;
    }
    if (t === "-A" || t === "--user-agent") {
      if (next) {
        headers.push({ name: "User-Agent", value: next });
        i++;
      }
      continue;
    }
    if (t === "-e" || t === "--referer") {
      if (next) {
        headers.push({ name: "Referer", value: next });
        i++;
      }
      continue;
    }
    if (t.startsWith("-")) {
      ignored.push(t);
      continue;
    }
    if (!t.startsWith("-") && !url) {
      urlCandidates.push(t);
    }
  }

  if (!url && urlCandidates.length) {
    const preferred = urlCandidates.find((candidate) => isUrlCandidate(candidate));
    url = preferred || urlCandidates[0];
    if (urlCandidates.length > 1) {
      warnings.push(`Multiple URL-like tokens found; using "${url}".`);
    }
  }

  if (dataFile && dataParts.length) {
    warnings.push("Multiple data flags include @file; using file body.");
    dataParts.length = 0;
  }

  const formContentType = /application\/x-www-form-urlencoded/i.test(getHeaderValue(headers, "content-type"));
  const jsonDetected = isJsonContentType(headers) || dataParts.some((part) => looksLikeJson(part));

  if (dataParts.length) {
    if (jsonDetected) {
      if (dataParts.length > 1) {
        warnings.push("Multiple JSON bodies detected; using last.");
      }
      body = dataParts[dataParts.length - 1];
    } else if (formContentType) {
      body = dataParts.join("&");
    } else {
      if (dataParts.length > 1) {
        warnings.push("Multiple data flags detected; joining with '&'.");
      }
      body = dataParts.join("&");
    }
  }

  if (useGet) {
    const params = new URLSearchParams();
    for (const field of urlEncoded) {
      const value = field.isFile ? "REPLACE_WITH_FILE_CONTENTS" : field.value;
      if (field.isFile) {
        warnings.push(`URL-encoded data "${field.name}" uses @${field.value}; replace placeholder with file contents.`);
      }
      params.append(field.name, value);
    }

    const rawSegments: string[] = [];
    if (body) {
      if (/[=&]/.test(body)) {
        const bodyParams = new URLSearchParams(body);
        for (const [name, value] of bodyParams.entries()) {
          params.append(name, value);
        }
      } else {
        warnings.push("GET mode (-G) with non-query body; appending raw data to URL.");
        rawSegments.push(body);
      }
      body = undefined;
    }

    if (dataFile) {
      warnings.push(`GET mode (-G) with @${dataFile} is not supported; replace with query values.`);
      dataFile = undefined;
    }

    if (form.length) {
      warnings.push("GET mode (-G) with multipart form data is not supported; skipping form body.");
      form.length = 0;
    }

    const queryParts = [];
    const paramsString = params.toString();
    if (paramsString) queryParts.push(paramsString);
    if (rawSegments.length) queryParts.push(...rawSegments);
    if (queryParts.length) {
      url = appendQuery(url, queryParts.join("&"));
    }
  }

  if (compressed) {
    warnings.push("curl --compressed adds Accept-Encoding; browsers control this header automatically.");
  }

  if (form.length) {
    warnings.push("Found -F (multipart) — enable FormData output.");
  }

  if (!url) throw new Error("No URL found. Try quoting the URL or using --url https://example.com.");
  return {
    url,
    method: method || (body || dataFile || form.length || urlEncoded.length ? "POST" : "GET"),
    headers,
    body,
    dataFile,
    form: form.length ? form : undefined,
    urlEncoded: urlEncoded.length ? urlEncoded : undefined,
    ignored,
    warnings,
  };
}

export function getHeaderValue(headers: Array<{ name: string; value: string }>, name: string) {
  const target = name.toLowerCase();
  for (let i = headers.length - 1; i >= 0; i -= 1) {
    if (headers[i].name.toLowerCase() === target) return headers[i].value;
  }
  return "";
}

export function isJsonContentType(headers: Array<{ name: string; value: string }>) {
  const contentType = getHeaderValue(headers, "content-type");
  return /application\/json|\+json/i.test(contentType);
}

export function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

export function isJsonAccept(headers: Array<{ name: string; value: string }>) {
  const accept = getHeaderValue(headers, "accept");
  if (!accept) return true;
  return /application\/json|\+json/i.test(accept);
}

export function indentMultiline(value: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : `${pad}${line}`))
    .join("\n");
}

export function shouldParseJson(parsed: ParseResult, opts: Options) {
  if (opts.responseMode === "json") return true;
  if (opts.responseMode === "text") return false;
  if (parsed.method === "HEAD") return false;
  return isJsonAccept(parsed.headers);
}

export function wrapLines(lines: string[], wrapAsync: boolean) {
  if (!wrapAsync) return lines.join("\n");
  return ["async function run() {", ...lines.map((line) => `  ${line}`), "}", "run().catch((err) => console.error(err));"]
    .join("\n");
}

export function buildFetchSnippet(parsed: ParseResult, opts: Options, variant: SnippetVariant, language: SnippetLanguage) {
  const optionsLines: string[] = [];
  const preLines: string[] = [];
  const isProduction = variant === "production";
  const isMinimal = variant === "minimal";
  if (parsed.method && parsed.method !== "GET") {
    optionsLines.push(`method: "${parsed.method}"`);
  }
  if (parsed.headers.length) {
    preLines.push("const headers = new Headers();");
    for (const header of parsed.headers) {
      preLines.push(`headers.append(${JSON.stringify(header.name)}, ${JSON.stringify(header.value)});`);
    }
    optionsLines.push("headers: headers");
  }
  if (parsed.form?.length) {
    preLines.push("const formData = new FormData();");
    for (const field of parsed.form) {
      if (field.isFile) {
        preLines.push(
          `formData.append(${JSON.stringify(field.name)}, new Blob([]), ${JSON.stringify(field.value)});`
        );
      } else {
        preLines.push(`formData.append(${JSON.stringify(field.name)}, ${JSON.stringify(field.value)});`);
      }
    }
    optionsLines.push("body: formData");
  } else if (parsed.urlEncoded?.length) {
    preLines.push("const formBody = new URLSearchParams();");
    for (const field of parsed.urlEncoded) {
      const value = field.isFile ? "REPLACE_WITH_FILE_CONTENTS" : field.value;
      preLines.push(`formBody.append(${JSON.stringify(field.name)}, ${JSON.stringify(value)});`);
    }
    optionsLines.push("body: formBody");
  } else if (parsed.dataFile) {
    preLines.push(`const body = "REPLACE_WITH_FILE_CONTENTS";`);
    optionsLines.push("body: body");
  } else if (parsed.body !== undefined) {
    let bodyValue = JSON.stringify(parsed.body);
    const jsonDetected = isJsonContentType(parsed.headers) || looksLikeJson(parsed.body);
    if (jsonDetected) {
      try {
        const parsedJson = JSON.parse(parsed.body);
        if (opts.prettyOptions) {
          const payloadLiteral = JSON.stringify(parsedJson, null, 2);
          if (language === "ts" || variant !== "minimal") {
            preLines.push(`const payload = ${payloadLiteral};`);
          }
          bodyValue = "JSON.stringify(payload)";
        } else {
          const jsonLiteral = JSON.stringify(parsedJson);
          bodyValue = `JSON.stringify(${jsonLiteral})`;
        }
      } catch {
        bodyValue = JSON.stringify(parsed.body);
      }
    }
    if (opts.prettyOptions && bodyValue.includes("\n")) {
      bodyValue = indentMultiline(bodyValue, 2);
    }
    optionsLines.push(`body: ${bodyValue}`);
  }

  const optionsBlock = optionsLines.length ? `{
  ${optionsLines.join(",\n  ")}
}` : "{}";
  const compactOptionsBlock = optionsLines.length ? `{ ${optionsLines.join(", ")} }` : "{}";
  const optionsLiteral = opts.prettyOptions ? optionsBlock : compactOptionsBlock;

  const responseParseLine = shouldParseJson(parsed, opts)
    ? "const data = await response.json();"
    : "const data = await response.text();";

  const optionsVarName = "options";
  const useOptionsVar = language === "ts" || isProduction;
  if (useOptionsVar) {
    if (language === "ts") {
      const suffix = opts.useSatisfies ? " satisfies RequestInit" : ": RequestInit";
      preLines.push(`const ${optionsVarName}${suffix} = ${optionsLiteral};`);
    } else {
      preLines.push(`const ${optionsVarName} = ${optionsLiteral};`);
    }
  }

  const fetchCall = useOptionsVar
    ? `fetch("${parsed.url}", ${optionsVarName})`
    : `fetch("${parsed.url}", ${optionsLiteral})`;
  const fetchCallWithSignal = useOptionsVar
    ? `fetch("${parsed.url}", { ...${optionsVarName}, signal: controller.signal })`
    : `fetch("${parsed.url}", { ...${optionsLiteral}, signal: controller.signal })`;

  const fetchLines: string[] = [];
  if (isProduction) {
    fetchLines.push("const maxRetries = 2;");
    fetchLines.push("const timeoutMs = 10000;");
    fetchLines.push("let response;");
    fetchLines.push("for (let attempt = 0; attempt <= maxRetries; attempt += 1) {");
    fetchLines.push("  const controller = new AbortController();");
    fetchLines.push("  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);");
    fetchLines.push("  try {");
    fetchLines.push(`    response = await ${fetchCallWithSignal};`);
    fetchLines.push("    if (!response.ok) throw new Error(`Request failed: ${response.status}`);");
    fetchLines.push("    break;");
    fetchLines.push("  } catch (err) {");
    fetchLines.push("    if (attempt === maxRetries) throw err;");
    fetchLines.push("  } finally {");
    fetchLines.push("    clearTimeout(timeoutId);");
    fetchLines.push("  }");
    fetchLines.push("}");
  } else {
    fetchLines.push(`const response = await ${fetchCall};`);
    if (!isMinimal) {
      fetchLines.push("if (!response.ok) throw new Error(`Request failed: ${response.status}`);");
    }
  }
  fetchLines.push(responseParseLine);
  fetchLines.push("console.log(data);");

  const lines = [...preLines, ...fetchLines];
  return wrapLines(lines, !isMinimal && opts.wrapAsync);
}

export function buildAxiosSnippet(parsed: ParseResult, opts: Options, variant: SnippetVariant) {
  const preLines: string[] = ['import axios from "axios";'];
  const configLines: string[] = [`method: "${parsed.method.toLowerCase()}"`, `url: "${parsed.url}"`];

  if (parsed.headers.length) {
    const headerLines = parsed.headers
      .map((header) => `  ${JSON.stringify(header.name)}: ${JSON.stringify(header.value)}`)
      .join(",\n");
    preLines.push(`const headers = {\n${headerLines}\n};`);
    configLines.push("headers");
  }

  if (parsed.form?.length) {
    preLines.push("const formData = new FormData();");
    for (const field of parsed.form) {
      if (field.isFile) {
        preLines.push(
          `formData.append(${JSON.stringify(field.name)}, new Blob([]), ${JSON.stringify(field.value)});`
        );
      } else {
        preLines.push(`formData.append(${JSON.stringify(field.name)}, ${JSON.stringify(field.value)});`);
      }
    }
    configLines.push("data: formData");
  } else if (parsed.urlEncoded?.length) {
    preLines.push("const formBody = new URLSearchParams();");
    for (const field of parsed.urlEncoded) {
      const value = field.isFile ? "REPLACE_WITH_FILE_CONTENTS" : field.value;
      preLines.push(`formBody.append(${JSON.stringify(field.name)}, ${JSON.stringify(value)});`);
    }
    configLines.push("data: formBody");
  } else if (parsed.dataFile) {
    preLines.push(`const data = "REPLACE_WITH_FILE_CONTENTS";`);
    configLines.push("data");
  } else if (parsed.body !== undefined) {
    const jsonDetected = isJsonContentType(parsed.headers) || looksLikeJson(parsed.body);
    if (jsonDetected) {
      try {
        const parsedJson = JSON.parse(parsed.body);
        preLines.push(`const data = ${JSON.stringify(parsedJson, null, 2)};`);
        configLines.push("data");
      } catch {
        configLines.push(`data: ${JSON.stringify(parsed.body)}`);
      }
    } else {
      configLines.push(`data: ${JSON.stringify(parsed.body)}`);
    }
  }

  if (variant === "production") {
    configLines.push("timeout: 10000");
    preLines.push("const maxRetries = 2;");
    preLines.push("let response;");
    preLines.push("for (let attempt = 0; attempt <= maxRetries; attempt += 1) {");
    preLines.push("  try {");
    preLines.push(`    response = await axios({\n  ${configLines.join(",\n  ")}\n});`);
    preLines.push("    break;");
    preLines.push("  } catch (err) {");
    preLines.push("    if (attempt === maxRetries) throw err;");
    preLines.push("  }");
    preLines.push("}");
    preLines.push("console.log(response.data);");
    return wrapLines(preLines, opts.wrapAsync);
  }

  const bodyLines = [
    `const response = await axios({\n  ${configLines.join(",\n  ")}\n});`,
    "console.log(response.data);",
  ];
  return wrapLines([...preLines, ...bodyLines], variant === "standard" ? opts.wrapAsync : false);
}

export function buildPythonSnippet(parsed: ParseResult) {
  const lines: string[] = ["import requests", "", `url = ${JSON.stringify(parsed.url)}`];
  if (parsed.headers.length) {
    lines.push("headers = {");
    for (const header of parsed.headers) {
      lines.push(`    ${JSON.stringify(header.name)}: ${JSON.stringify(header.value)},`);
    }
    lines.push("}");
  } else {
    lines.push("headers = {}");
  }

  let bodyLine = "";
  if (parsed.form?.length) {
    lines.push("data = {");
    for (const field of parsed.form) {
      if (field.isFile) {
        lines.push(`    ${JSON.stringify(field.name)}: open(${JSON.stringify(field.value)}, \"rb\"),`);
      } else {
        lines.push(`    ${JSON.stringify(field.name)}: ${JSON.stringify(field.value)},`);
      }
    }
    lines.push("}");
    bodyLine = "data=data";
  } else if (parsed.urlEncoded?.length) {
    lines.push("data = {");
    for (const field of parsed.urlEncoded) {
      const value = field.isFile ? "REPLACE_WITH_FILE_CONTENTS" : field.value;
      lines.push(`    ${JSON.stringify(field.name)}: ${JSON.stringify(value)},`);
    }
    lines.push("}");
    bodyLine = "data=data";
  } else if (parsed.dataFile) {
    lines.push(`data = open(${JSON.stringify(parsed.dataFile)}, \"rb\").read()`);
    bodyLine = "data=data";
  } else if (parsed.body !== undefined) {
    const jsonDetected = isJsonContentType(parsed.headers) || looksLikeJson(parsed.body);
    if (jsonDetected) {
      try {
        const parsedJson = JSON.parse(parsed.body);
        lines.push(`json_body = ${JSON.stringify(parsedJson, null, 2)}`);
        bodyLine = "json=json_body";
      } catch {
        lines.push(`data = ${JSON.stringify(parsed.body)}`);
        bodyLine = "data=data";
      }
    } else {
      lines.push(`data = ${JSON.stringify(parsed.body)}`);
      bodyLine = "data=data";
    }
  }

  const args = [`method=${JSON.stringify(parsed.method)}`, "url=url", "headers=headers"];
  if (bodyLine) args.push(bodyLine);
  lines.push("");
  lines.push(`response = requests.request(${args.join(", ")})`);
  lines.push("print(response.text)");
  return lines.join("\n");
}

export function buildGoSnippet(parsed: ParseResult) {
  const lines: string[] = [
    "package main",
    "",
    "import (",
    '  "bytes"',
    '  "net/http"',
    '  "net/url"',
    '  "mime/multipart"',
    '  "os"',
    ")",
    "",
    "func main() {",
    `  endpoint := ${JSON.stringify(parsed.url)}`,
  ];

  let bodyExpr = "nil";
  let contentTypeLine = "";

  if (parsed.form?.length) {
    lines.push("  var body bytes.Buffer");
    lines.push("  writer := multipart.NewWriter(&body)");
    for (const field of parsed.form) {
      if (field.isFile) {
        lines.push(`  file, _ := os.Open(${JSON.stringify(field.value)})`);
        lines.push("  defer file.Close()");
        lines.push(`  part, _ := writer.CreateFormFile(${JSON.stringify(field.name)}, ${JSON.stringify(field.value)})`);
        lines.push("  _, _ = part.ReadFrom(file)");
      } else {
        lines.push(`  _ = writer.WriteField(${JSON.stringify(field.name)}, ${JSON.stringify(field.value)})`);
      }
    }
    lines.push("  _ = writer.Close()");
    bodyExpr = "&body";
    contentTypeLine = "  req.Header.Set(\"Content-Type\", writer.FormDataContentType())";
  } else if (parsed.urlEncoded?.length) {
    lines.push("  form := url.Values{}");
    for (const field of parsed.urlEncoded) {
      const value = field.isFile ? "REPLACE_WITH_FILE_CONTENTS" : field.value;
      lines.push(`  form.Set(${JSON.stringify(field.name)}, ${JSON.stringify(value)})`);
    }
    lines.push("  body := bytes.NewBufferString(form.Encode())");
    bodyExpr = "body";
    contentTypeLine = '  req.Header.Set("Content-Type", "application/x-www-form-urlencoded")';
  } else if (parsed.dataFile) {
    lines.push(`  data, _ := os.ReadFile(${JSON.stringify(parsed.dataFile)})`);
    lines.push("  body := bytes.NewBuffer(data)");
    bodyExpr = "body";
  } else if (parsed.body !== undefined) {
    lines.push(`  body := bytes.NewBufferString(${JSON.stringify(parsed.body)})`);
    bodyExpr = "body";
  }

  lines.push(`  req, _ := http.NewRequest(${JSON.stringify(parsed.method)}, endpoint, ${bodyExpr})`);
  for (const header of parsed.headers) {
    lines.push(`  req.Header.Add(${JSON.stringify(header.name)}, ${JSON.stringify(header.value)})`);
  }
  if (contentTypeLine) lines.push(contentTypeLine);
  lines.push("  client := &http.Client{}");
  lines.push("  resp, _ := client.Do(req)");
  lines.push("  if resp != nil {");
  lines.push("    defer resp.Body.Close()");
  lines.push("  }");
  lines.push("}");
  return lines.join("\n");
}

export function buildSnippet(parsed: ParseResult, opts: Options, variant: SnippetVariant, languageOverride?: SnippetLanguage) {
  const target = opts.target;
  if (target === "axios") {
    return buildAxiosSnippet(parsed, opts, variant);
  }
  if (target === "python-requests") {
    return buildPythonSnippet(parsed);
  }
  if (target === "go-http") {
    return buildGoSnippet(parsed);
  }
  const language = languageOverride || (opts.typescript ? "ts" : "js");
  return buildFetchSnippet(parsed, opts, variant, language);
}
