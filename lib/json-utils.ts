import JSON5 from 'json5';
import Ajv from 'ajv';

export interface ParseResult {
  parsed: unknown;
  error: string | null;
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
          error: `Invalid JSON at line ${line}, column ${column}: ${err.message}`
        };
      }
      return { parsed: null, error: `Invalid JSON: ${err.message}` };
    }
    return { parsed: null, error: "Invalid JSON. Ensure keys and strings use quotes." };
  }
}

/**
 * Recursively sort object keys alphabetically
 */
export function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        return result;
      }, {});
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
  key: string;
  value: unknown;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string[];
  children?: TreeNode[];
  collapsed?: boolean;
}

export function buildTreeStructure(obj: unknown, path: string[] = []): TreeNode[] {
  if (Array.isArray(obj)) {
    return obj.map((item, index) => ({
      key: `[${index}]`,
      value: item,
      type: getValueType(item),
      path: [...path, String(index)],
      children: isComplexType(item) ? buildTreeStructure(item, [...path, String(index)]) : undefined,
      collapsed: true,
    }));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value,
      type: getValueType(value),
      path: [...path, key],
      children: isComplexType(value) ? buildTreeStructure(value, [...path, key]) : undefined,
      collapsed: true,
    }));
  }

  return [];
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
