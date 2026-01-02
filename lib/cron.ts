import { parseExpression } from "cron-parser";

export type CronDiagnostic = {
  fieldLabel: string;
  token: string;
  allowed: string;
  suggestion: string;
  expression: string;
};

type FieldRules = {
  label: string;
  min: number;
  max: number;
  allowSundaySeven?: boolean;
};

export const parseRange = (part: string) => {
  const [startStr, endStr] = part.split("-");
  if (!startStr || !endStr) return null;
  const start = Number(startStr);
  const end = Number(endStr);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
};

export const parseStep = (part: string) => {
  if (!part.includes("/")) return null;
  const [base, stepStr] = part.split("/");
  const step = Number(stepStr);
  if (!base || Number.isNaN(step) || step <= 0) return null;
  return { base, step };
};

const parseListField = (field: string) => field.split(",").map((part) => part.trim()).filter(Boolean);

export const normalizeExprForMode = (expression: string, useSeconds: boolean) => {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (useSeconds && parts.length === 5) return `0 ${trimmed}`;
  if (!useSeconds && parts.length === 6) return parts.slice(1).join(" ");
  return trimmed;
};

export const getCronParts = (expression: string, useSeconds: boolean) => {
  const normalized = normalizeExprForMode(expression, useSeconds);
  const parts = normalized.trim().split(/\s+/).filter(Boolean);
  if (useSeconds ? parts.length !== 6 : parts.length !== 5) return null;
  const [secField, minField, hourField, domField, monField, dowField] = useSeconds ? parts : ["0", ...parts];
  return { secField, minField, hourField, domField, monField, dowField };
};

const buildAllowedHint = (rules: FieldRules) => {
  if (rules.allowSundaySeven) return `${rules.min}-${rules.max} (or 7 for Sunday), *, ranges (a-b), steps (*/n), lists (a,b,c)`;
  return `${rules.min}-${rules.max}, *, ranges (a-b), steps (*/n), lists (a,b,c)`;
};

const validateFieldToken = (token: string, rules: FieldRules) => {
  if (token === "*") return "";
  const allowedMax = rules.allowSundaySeven ? Math.max(rules.max, 7) : rules.max;
  const checkValue = (value: number) => value >= rules.min && value <= allowedMax;
  const step = parseStep(token);
  const base = step ? step.base : token;
  const stepValue = step?.step ?? 1;
  if (step && (!Number.isFinite(stepValue) || stepValue <= 0)) return "Step must be a positive number.";

  const range = parseRange(base);
  if (range) {
    if (!checkValue(range.start) || !checkValue(range.end)) return "Range values are out of bounds.";
    if (range.start > range.end) return "Range start must be <= end.";
    return "";
  }

  if (/^\d+$/.test(base)) {
    const value = Number(base);
    if (!checkValue(value)) return "Value is out of bounds.";
    return "";
  }

  return "Token format is not supported.";
};

export const getCronDiagnostics = (expression: string, useSeconds: boolean): CronDiagnostic | null => {
  const parts = getCronParts(expression, useSeconds);
  if (!parts) return null;
  const fields: Array<[string, FieldRules]> = [
    [parts.secField, { label: "Second", min: 0, max: 59 }],
    [parts.minField, { label: "Minute", min: 0, max: 59 }],
    [parts.hourField, { label: "Hour", min: 0, max: 23 }],
    [parts.domField, { label: "Day of month", min: 1, max: 31 }],
    [parts.monField, { label: "Month", min: 1, max: 12 }],
    [parts.dowField, { label: "Day of week", min: 0, max: 6, allowSundaySeven: true }],
  ];
  const relevantFields = useSeconds ? fields : fields.slice(1);

  for (const [fieldValue, rules] of relevantFields) {
    const tokens = parseListField(fieldValue);
    for (const token of tokens) {
      const message = validateFieldToken(token, rules);
      if (message) {
        return {
          fieldLabel: rules.label,
          token,
          allowed: buildAllowedHint(rules),
          suggestion: "Try *, min-max, or */5.",
          expression,
        };
      }
    }
  }
  return null;
};

export const computeNextRuns = (
  expr: string,
  count = 5,
  includeSeconds = false,
  timezone = "local",
  currentDate: Date = new Date()
) => {
  const parts = expr.trim().split(/\s+/);
  if (includeSeconds ? parts.length !== 6 : parts.length !== 5) {
    return {
      error: includeSeconds ? "Cron must have 6 fields: s m h dom mon dow" : "Cron must have 5 fields: m h dom mon dow",
      runs: [],
      dates: [],
    };
  }
  try {
    const iterator = parseExpression(expr, {
      currentDate,
      tz: timezone === "local" ? undefined : timezone,
    });
    const runs: string[] = [];
    const dates: Date[] = [];
    for (let i = 0; i < count; i += 1) {
      const next = iterator.next();
      const nextDate = typeof next?.toDate === "function" ? next.toDate() : next;
      if (!(nextDate instanceof Date)) {
        return { error: "Unable to compute next run time.", runs: [], dates: [] };
      }
      runs.push(nextDate.toISOString());
      dates.push(nextDate);
    }
    return runs.length ? { error: "", runs, dates } : { error: "No occurrences found soon. Check the expression.", runs: [], dates: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid cron expression.";
    return { error: message, runs: [], dates: [] };
  }
};
