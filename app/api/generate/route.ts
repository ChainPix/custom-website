import { NextResponse } from "next/server";
import { generateMockData, normalizeSchemaFields } from "@/lib/mock-data/generator";

type RateLimitEntry = { count: number; resetAt: number };

type GlobalRateLimit = typeof globalThis & {
  __mockDataRateLimit?: Map<string, RateLimitEntry>;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const MAX_COUNT = 10000;

function getRateLimitStore() {
  const globalForRateLimit = globalThis as GlobalRateLimit;
  if (!globalForRateLimit.__mockDataRateLimit) {
    globalForRateLimit.__mockDataRateLimit = new Map();
  }
  return globalForRateLimit.__mockDataRateLimit;
}

function getApiKey(headers: Headers) {
  const headerKey = headers.get("x-api-key");
  if (headerKey) return headerKey;
  const auth = headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

function getClientId(headers: Headers, apiKey: string | null) {
  const forwardedFor = headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : headers.get("x-real-ip") || "unknown";
  return `${apiKey || "anon"}:${ip}`;
}

function checkRateLimit(clientId: string) {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store.get(clientId);
  if (!entry || now > entry.resetAt) {
    store.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function POST(request: Request) {
  const configuredKey = process.env.MOCK_DATA_API_KEY;
  if (!configuredKey) {
    return NextResponse.json({ error: "API key is not configured." }, { status: 500 });
  }

  const providedKey = getApiKey(request.headers);
  if (providedKey !== configuredKey) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientId = getClientId(request.headers, providedKey);
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const options = body?.options ?? {};
  const fieldsInput = body?.fields ?? body?.schema?.fields ?? body?.schema ?? options?.fields;

  if (!Array.isArray(fieldsInput) || !fieldsInput.length) {
    return NextResponse.json({ error: "Schema fields are required." }, { status: 400 });
  }

  const fields = normalizeSchemaFields(fieldsInput);
  const count = Number(body?.count ?? options?.count ?? 10);
  if (!Number.isFinite(count) || count <= 0 || count > MAX_COUNT) {
    return NextResponse.json(
      { error: `Count must be between 1 and ${MAX_COUNT}.` },
      { status: 400 }
    );
  }

  const format = String(body?.format ?? options?.format ?? "json").toLowerCase();
  if (!"json,csv,sql".split(",").includes(format)) {
    return NextResponse.json({ error: "Format must be json, csv, or sql." }, { status: 400 });
  }

  const result = generateMockData({
    fields,
    count,
    format,
    seed: body?.seed ?? options?.seed,
    pretty: body?.pretty ?? options?.pretty,
    locale: body?.locale ?? options?.locale,
    domainPack: body?.domainPack ?? options?.domainPack,
    schemaName: body?.schemaName ?? options?.schemaName,
  });

  const contentType = format === "csv" ? "text/csv" : format === "sql" ? "text/plain" : "application/json";

  return new Response(result.output, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Cache-Control": "no-store",
    },
  });
}
