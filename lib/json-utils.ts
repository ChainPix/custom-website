import JSON5 from 'json5';
import Ajv from 'ajv';

export interface ParseResult {
  parsed: unknown;
  error: string | null;
  errorLocation?: { line: number; column: number } | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Parse JSON with better error messages including line and column info
 */
export function parseWithBetterError(jsonString: string, useJSON5: boolean = false): ParseResult {
  try {
    const parsed = useJSON5 ? JSON5.parse(jsonString) : JSON.parse(jsonString);
    return { parsed, error: null };
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Try to extract line/column info from error message
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const lines = jsonString.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return {
          parsed: null,
          error: `Invalid JSON at line ${line}, column ${column}: ${err.message}`,
          errorLocation: { line, column },
        };
      }
      return { parsed: null, error: `Invalid JSON: ${err.message}`, errorLocation: null };
    }
    return { parsed: null, error: "Invalid JSON. Ensure keys and strings use quotes.", errorLocation: null };
  }
}

/**
 * Recursively sort object keys alphabetically
 */
export function sortObjectKeys(obj: unknown, recursive: boolean = true): unknown {
  if (Array.isArray(obj)) {
    return recursive ? obj.map((item) => sortObjectKeys(item, true)) : obj;
  }
  if (obj !== null && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const value = (obj as Record<string, unknown>)[key];
      result[key] = recursive ? sortObjectKeys(value, true) : value;
    }
    return result;
  }
  return obj;
}

/**
 * Escape special characters in a JSON string
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\b/g, '\\b');
}

/**
 * Unescape special characters in a JSON string
 */
export function unescapeString(str: string): string {
  try {
    // Safely escape before JSON.parse to handle quotes/backslashes/newlines
    const escaped = str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f')
      .replace(/\b/g, '\\b');
    return JSON.parse(`"${escaped}"`);
  } catch {
    // Fallback to manual unescaping if JSON.parse fails
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\f/g, '\f')
      .replace(/\\b/g, '\b')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

/**
 * Get the JSON path to a specific position in the JSON string
 */
export function getJSONPath(jsonObj: unknown, targetPath: string[]): string {
  const pathParts = targetPath.map((part, index) => {
    // Check if part is a number (array index)
    if (!isNaN(Number(part))) {
      return `[${part}]`;
    }
    return index === 0 ? part : `.${part}`;
  });

  return 'Root' + (pathParts.length > 0 ? ' > ' + pathParts.join('') : '');
}

/**
 * Build a tree structure from JSON for tree view
 */
export interface TreeNode {
  id: string;
  key: string;
  value: unknown;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string[];
  children?: TreeNode[];
  collapsed?: boolean;
}

export function buildTreeStructure(obj: unknown, path: string[] = []): TreeNode[] {
  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const nodePath = [...path, String(index)];
      return {
        id: toJsonPointer(nodePath),
        key: `[${index}]`,
        value: item,
        type: getValueType(item),
        path: nodePath,
        children: isComplexType(item) ? buildTreeStructure(item, nodePath) : undefined,
        collapsed: true,
      };
    });
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).map(([key, value]) => {
      const nodePath = [...path, key];
      return {
        id: toJsonPointer(nodePath),
        key,
        value,
        type: getValueType(value),
        path: nodePath,
        children: isComplexType(value) ? buildTreeStructure(value, nodePath) : undefined,
        collapsed: true,
      };
    });
  }

  return [];
}

function toJsonPointer(path: string[]): string {
  if (path.length === 0) return '';
  return path.map((segment) => `/${segment.replace(/~/g, '~0').replace(/\//g, '~1')}`).join('');
}

function getValueType(value: unknown): TreeNode['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as TreeNode['type'];
}

function isComplexType(value: unknown): boolean {
  return (value !== null && typeof value === 'object') || Array.isArray(value);
}

/**
 * Validate JSON against a JSON Schema
 */
export function validateJSONSchema(data: unknown, schema: unknown): ValidationResult {
  try {
    const ajv = getAjvInstance();
    const validate = ajv.compile(schema as object);
    const valid = validate(data);

    if (!valid && validate.errors) {
      const errors = validate.errors.map(error => ({
        path: error.instancePath || 'root',
        message: error.message || 'Validation error',
      }));
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  } catch (err) {
    return {
      valid: false,
      errors: [{
        path: 'schema',
        message: err instanceof Error ? err.message : 'Invalid schema format',
      }],
    };
  }
}

let ajvInstance: Ajv | null = null;

function getAjvInstance() {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
  }
  return ajvInstance;
}

/**
 * Format JSON value for display
 */
export function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') return `Object(${Object.keys(value).length})`;
  return String(value);
}

type JsonTextAnalysis = {
  duplicateKeyPointers: string[];
  hasComments: boolean;
  hasTrailingCommas: boolean;
  numberLiterals: Record<string, string>;
};

const isIdentifierStart = (char: string) => /[A-Za-z_$]/.test(char);
const isIdentifierPart = (char: string) => /[A-Za-z0-9_$]/.test(char);

const pathToPointer = (path: string[]) =>
  path.length === 0
    ? ""
    : path.map((segment) => `/${segment.replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");

const readString = (input: string, start: number, quote: string) => {
  let i = start + 1;
  let value = "";
  while (i < input.length) {
    const char = input[i];
    if (char === "\\") {
      value += char;
      i += 1;
      if (i < input.length) {
        value += input[i];
        i += 1;
      }
      continue;
    }
    if (char === quote) {
      return { value, nextIndex: i + 1 };
    }
    value += char;
    i += 1;
  }
  return { value, nextIndex: i };
};

export function analyzeJsonText(input: string, allowJSON5: boolean): JsonTextAnalysis {
  let i = 0;
  const duplicateKeyPointers = new Set<string>();
  const numberLiterals: Record<string, string> = {};
  let hasComments = false;
  let hasTrailingCommas = false;

  const skipWhitespaceAndComments = () => {
    while (i < input.length) {
      const char = input[i];
      if (/\s/.test(char)) {
        i += 1;
        continue;
      }
      if (char === "/" && input[i + 1] === "/") {
        hasComments = true;
        i += 2;
        while (i < input.length && input[i] !== "\n") i += 1;
        continue;
      }
      if (char === "/" && input[i + 1] === "*") {
        hasComments = true;
        i += 2;
        while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i += 1;
        i += 2;
        continue;
      }
      break;
    }
  };

  const parseValue = (path: string[]) => {
    skipWhitespaceAndComments();
    const char = input[i];
    if (char === "{") {
      i += 1;
      parseObject(path);
      return;
    }
    if (char === "[") {
      i += 1;
      parseArray(path);
      return;
    }
    if (char === "\"" || (allowJSON5 && char === "'")) {
      const result = readString(input, i, char);
      i = result.nextIndex;
      return;
    }
    if (char === "-" || /\d/.test(char)) {
      const start = i;
      i += 1;
      while (i < input.length && /[0-9eE.+-]/.test(input[i])) i += 1;
      const literal = input.slice(start, i);
      numberLiterals[pathToPointer(path)] = literal;
      return;
    }
    if (allowJSON5 && isIdentifierStart(char)) {
      let start = i;
      i += 1;
      while (i < input.length && isIdentifierPart(input[i])) i += 1;
      const keyword = input.slice(start, i);
      if (keyword === "true" || keyword === "false" || keyword === "null") return;
      return;
    }
    i += 1;
  };

  const parseObject = (path: string[]) => {
    skipWhitespaceAndComments();
    if (input[i] === "}") {
      i += 1;
      return;
    }
    const keySet = new Set<string>();
    while (i < input.length) {
      skipWhitespaceAndComments();
      let key = "";
      const char = input[i];
      if (char === "\"" || (allowJSON5 && char === "'")) {
        const result = readString(input, i, char);
        key = result.value;
        i = result.nextIndex;
      } else if (allowJSON5 && isIdentifierStart(char)) {
        const start = i;
        i += 1;
        while (i < input.length && isIdentifierPart(input[i])) i += 1;
        key = input.slice(start, i);
      } else {
        return;
      }
      const pointer = pathToPointer([...path, key]);
      if (keySet.has(key)) duplicateKeyPointers.add(pointer);
      keySet.add(key);
      skipWhitespaceAndComments();
      if (input[i] === ":") i += 1;
      parseValue([...path, key]);
      skipWhitespaceAndComments();
      if (input[i] === ",") {
        i += 1;
        skipWhitespaceAndComments();
        if (input[i] === "}") {
          hasTrailingCommas = true;
        }
        continue;
      }
      if (input[i] === "}") {
        i += 1;
        return;
      }
      return;
    }
  };

  const parseArray = (path: string[]) => {
    skipWhitespaceAndComments();
    if (input[i] === "]") {
      i += 1;
      return;
    }
    let index = 0;
    while (i < input.length) {
      parseValue([...path, String(index)]);
      index += 1;
      skipWhitespaceAndComments();
      if (input[i] === ",") {
        i += 1;
        skipWhitespaceAndComments();
        if (input[i] === "]") {
          hasTrailingCommas = true;
        }
        continue;
      }
      if (input[i] === "]") {
        i += 1;
        return;
      }
      return;
    }
  };

  parseValue([]);
  return {
    duplicateKeyPointers: Array.from(duplicateKeyPointers),
    hasComments,
    hasTrailingCommas,
    numberLiterals,
  };
}

export function stringifyWithNumberLiterals(
  value: unknown,
  options: { indent: number },
  numberLiterals: Record<string, string>,
  path: string[] = [],
  level: number = 0,
): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    const pointer = pathToPointer(path);
    return numberLiterals[pointer] ?? String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item, index) =>
      stringifyWithNumberLiterals(item, options, numberLiterals, [...path, String(index)], level + 1),
    );
    if (options.indent === 0) {
      return `[${items.join(",")}]`;
    }
    const pad = " ".repeat(options.indent * level);
    const innerPad = " ".repeat(options.indent * (level + 1));
    return `[\n${items.map((item) => `${innerPad}${item}`).join(",\n")}\n${pad}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return "{}";
    const entries = keys.map((key) => {
      const child = (value as Record<string, unknown>)[key];
      const childValue = stringifyWithNumberLiterals(child, options, numberLiterals, [...path, key], level + 1);
      return `${JSON.stringify(key)}:${options.indent === 0 ? "" : " "}${childValue}`;
    });
    if (options.indent === 0) {
      return `{${entries.join(",")}}`;
    }
    const pad = " ".repeat(options.indent * level);
    const innerPad = " ".repeat(options.indent * (level + 1));
    return `{\n${entries.map((entry) => `${innerPad}${entry}`).join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(value);
}

type JsonSchema = {
  $schema?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
};

function uniqueSchemas(schemas: JsonSchema[]) {
  const seen = new Set<string>();
  const result: JsonSchema[] = [];
  for (const schema of schemas) {
    const key = JSON.stringify(schema);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(schema);
    }
  }
  return result;
}

function buildSchema(value: unknown): JsonSchema {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: "array", items: {} };
    }
    const itemSchemas = uniqueSchemas(value.map((item) => buildSchema(item)));
    if (itemSchemas.length === 1) {
      return { type: "array", items: itemSchemas[0] };
    }
    return { type: "array", items: { anyOf: itemSchemas } };
  }
  if (typeof value === "string") return { type: "string" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number" };
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, child] of entries) {
      properties[key] = buildSchema(child);
      required.push(key);
    }
    return {
      type: "object",
      properties,
      required,
    };
  }
  return {};
}

export function generateJSONSchema(value: unknown): JsonSchema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...buildSchema(value),
  };
}
