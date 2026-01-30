"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";
import { TreeView } from "../json-formatter/TreeView";
import { buildTreeStructure, getJSONPath, type TreeNode } from "@/lib/json-utils";

function decodeBase64Url(segment: string): Uint8Array {
  const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  return toArrayBuffer(decodeBase64(cleaned));
}

function decodeSegment(segment: string): { value: Record<string, unknown> | null; error?: string } {
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64Url(segment);
  } catch (err) {
    return { value: null, error: "Invalid base64url segment." };
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return { value: JSON.parse(decoded) };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { value: null, error: "Invalid JSON in decoded segment." };
    }
    return { value: null, error: "Unable to decode segment as UTF-8 JSON." };
  }
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp * 1000);
  return `${date.toISOString()} (${date.toLocaleString()})`;
}

function formatRelativeTime(timestamp?: number) {
  if (!timestamp) return "N/A";
  const now = Date.now();
  const target = timestamp * 1000;
  const diffMs = target - now;
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);
  if (absSec < 60) return diffSec >= 0 ? "in seconds" : "seconds ago";
  const units: Array<[number, string]> = [
    [60, "minute"],
    [60 * 60, "hour"],
    [60 * 60 * 24, "day"],
    [60 * 60 * 24 * 7, "week"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24 * 365, "year"],
  ];
  let unit = units[0];
  for (const entry of units) {
    if (absSec >= entry[0]) unit = entry;
  }
  const value = Math.round(absSec / unit[0]);
  const label = value === 1 ? unit[1] : `${unit[1]}s`;
  return diffSec >= 0 ? `in ${value} ${label}` : `${value} ${label} ago`;
}

function formatClaim(value: unknown) {
  if (value === undefined || value === null) return "N/A";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function maskString(value: string) {
  if (!value) return "***";
  if (value.length <= 4) return "***";
  const tail = value.slice(-4);
  return `${"*".repeat(Math.max(4, value.length - 4))}${tail}`;
}

function redactValue(value: unknown, path = ""): unknown {
  const key = path.split(".").slice(-1)[0]?.toLowerCase() ?? "";
  const sensitiveKeys = [
    "sub",
    "email",
    "token",
    "access_token",
    "refresh_token",
    "id",
    "user_id",
    "account_id",
    "client_id",
    "session",
  ];
  if (typeof value === "string" && sensitiveKeys.some((entry) => key.includes(entry))) {
    return maskString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => redactValue(entry, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, path ? `${path}.${childKey}` : childKey),
      ])
    );
  }
  return value;
}

function formatCopyValue(value: unknown) {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
  const term = query.trim().toLowerCase();
  if (!term) return nodes;

  const matchesNode = (node: TreeNode) => {
    const valueText =
      node.value === null || node.value === undefined
        ? ""
        : typeof node.value === "string"
          ? node.value
          : JSON.stringify(node.value);
    const pathText = node.path.join(".");
    return (
      node.key.toLowerCase().includes(term) ||
      pathText.toLowerCase().includes(term) ||
      valueText.toLowerCase().includes(term)
    );
  };

  const filterNode = (node: TreeNode): TreeNode | null => {
    const children = node.children?.map(filterNode).filter(Boolean) as TreeNode[] | undefined;
    if (matchesNode(node) || (children && children.length)) {
      return { ...node, children };
    }
    return null;
  };

  return nodes.map(filterNode).filter(Boolean) as TreeNode[];
}

type JwtHeader = Record<string, unknown> & {
  alg?: string;
  typ?: string;
  kid?: string;
  cty?: string;
};

type JwtPayload = Record<string, unknown> & {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
};

type DecodedJwtResult = {
  state: "empty" | "invalid" | "partial" | "decoded" | "jwe";
  errors: { structure?: string; header?: string; payload?: string };
  header: JwtHeader | null;
  payload: JwtPayload | null;
  signature: string;
  tokenType: "JWS" | "JWE" | "invalid" | "unknown";
  parts: string[];
  signingInput: string;
};

function decodeJwt(input: string): DecodedJwtResult {
  const base: DecodedJwtResult = {
    state: "empty",
    errors: {},
    header: null,
    payload: null,
    signature: "",
    tokenType: "unknown",
    parts: [],
    signingInput: "",
  };

  const trimmed = input.trim();
  if (!trimmed) return base;

  const parts = trimmed.split(".");
  if (parts.length !== 3 && parts.length !== 5) {
    return {
      ...base,
      state: "invalid",
      tokenType: "invalid",
      errors: { structure: "Invalid token format. Expected 3-part JWS or 5-part JWE." },
    };
  }
  if (parts.some((part) => part.length === 0)) {
    return {
      ...base,
      state: "invalid",
      tokenType: "invalid",
      errors: { structure: "Token contains an empty segment." },
    };
  }

  const isJwe = parts.length === 5;
  const [h, p] = parts;
  const next: DecodedJwtResult = {
    ...base,
    tokenType: isJwe ? "JWE" : "JWS",
    signature: isJwe ? "" : (parts[2] ?? ""),
    parts,
    signingInput: isJwe ? "" : `${parts[0] ?? ""}.${parts[1] ?? ""}`,
  };

  const hDecoded = decodeSegment(h ?? "");
  if (!hDecoded.value) {
    next.errors.header = hDecoded.error ?? "Failed to decode header. Check base64url encoding.";
  } else {
    next.header = hDecoded.value;
  }

  if (isJwe) {
    next.errors.payload = "Encrypted payload. Decrypt the token to view claims.";
    return {
      ...next,
      state: "jwe",
    };
  }

  const pDecoded = decodeSegment(p ?? "");
  if (!pDecoded.value) {
    next.errors.payload = pDecoded.error ?? "Failed to decode payload. Check base64url encoding.";
  } else {
    next.payload = pDecoded.value;
  }

  const hasErrors = Boolean(next.errors.header || next.errors.payload);
  return {
    ...next,
    state: hasErrors ? "partial" : "decoded",
  };
}

function getStateLabel(state: DecodedJwtResult["state"]) {
  switch (state) {
    case "empty":
      return "Awaiting input";
    case "invalid":
      return "Invalid format";
    case "partial":
      return "Partially decoded";
    case "decoded":
      return "Decoded";
    case "jwe":
      return "JWE detected";
    default:
      return "Ready";
  }
}

function formatDiffValue(value: unknown) {
  if (value === undefined) return "--";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function flattenValue(
  value: unknown,
  prefix = "",
  map = new Map<string, unknown>()
): Map<string, unknown> {
  if (value === null || typeof value !== "object") {
    map.set(prefix || "(root)", value);
    return map;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      flattenValue(entry, `${prefix}[${index}]`, map);
    });
    return map;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenValue(entry, nextPrefix, map);
  });
  return map;
}

function diffObjects(left: Record<string, unknown> | null, right: Record<string, unknown> | null) {
  if (!left || !right) return [];
  const leftMap = flattenValue(left);
  const rightMap = flattenValue(right);
  const paths = new Set([...leftMap.keys(), ...rightMap.keys()]);
  const diff = Array.from(paths).map((path) => {
    const hasLeft = leftMap.has(path);
    const hasRight = rightMap.has(path);
    const leftValue = leftMap.get(path);
    const rightValue = rightMap.get(path);
    if (hasLeft && !hasRight) {
      return { path, type: "removed" as const, left: leftValue, right: undefined };
    }
    if (!hasLeft && hasRight) {
      return { path, type: "added" as const, left: undefined, right: rightValue };
    }
    if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
      return { path, type: "changed" as const, left: leftValue, right: rightValue };
    }
    return { path, type: "same" as const, left: leftValue, right: rightValue };
  });
  return diff.filter((entry) => entry.type !== "same");
}

const LARGE_CHARS = 50000;
const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJ0b29sc3RhY2siLCJzdWIiOiJ1c2VyMTIzIiwiZXhwIjo0MDAwMDAwMDAwLCJuYmYiIjoxNzAwMDAwMDAwfQ." +
  "signature-not-verified";

export default function JwtDecoderClient() {
  const [token, setToken] = useState("");
  const deferredToken = useDeferredValue(token);
  const [tokenB, setTokenB] = useState("");
  const deferredTokenB = useDeferredValue(tokenB);
  const [copied, setCopied] = useState<"header" | "payload" | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [warningB, setWarningB] = useState("");
  const [pretty, setPretty] = useState(true);
  const [redactMode, setRedactMode] = useState(true);
  const [rememberToken, setRememberToken] = useState(false);
  const [claimFilter, setClaimFilter] = useState("");
  const [viewMode, setViewMode] = useState<"formatted" | "tree">("formatted");
  const [compareMode, setCompareMode] = useState(false);
  const [verificationMode, setVerificationMode] = useState<"secret" | "publicKey" | "jwks">("secret");
  const [secret, setSecret] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [jwksUrl, setJwksUrl] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "verifying" | "valid" | "invalid" | "unverified" | "error"
  >("idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  const result = useMemo(() => decodeJwt(deferredToken), [deferredToken]);
  const resultB = useMemo(() => decodeJwt(deferredTokenB), [deferredTokenB]);

  useEffect(() => {
    setActionMessage("");
    setVerifyStatus("idle");
    setVerifyMessage("");
    const trimmed = deferredToken.trim();
    if (!trimmed) {
      setWarning("");
      return;
    }

    if (trimmed.length > LARGE_CHARS) {
      setWarning(`Large token (${trimmed.length.toLocaleString()} chars). Decoding may be slow.`);
    } else {
      setWarning("");
    }
  }, [deferredToken]);

  useEffect(() => {
    const trimmed = deferredTokenB.trim();
    if (!trimmed) {
      setWarningB("");
      return;
    }

    if (trimmed.length > LARGE_CHARS) {
      setWarningB(`Large token (${trimmed.length.toLocaleString()} chars). Decoding may be slow.`);
    } else {
      setWarningB("");
    }
  }, [deferredTokenB]);

  const handleCopy = async (text: string, key: "header" | "payload") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleCopyAll = async () => {
    const obj = { header: result.header, payload: result.payload, signature: result.signature };
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, pretty ? 2 : 0));
      setActionMessage("Copied all");
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleCopyCurl = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setActionMessage("No token to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(`Authorization: Bearer ${trimmed}`);
      setActionMessage("Copied cURL header");
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleCopyEnv = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setActionMessage("No token to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(`JWT=${trimmed}`);
      setActionMessage("Copied env var");
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleDownloadAll = () => {
    const obj = { header: result.header, payload: result.payload, signature: result.signature };
    const blob = new Blob([JSON.stringify(obj, null, pretty ? 2 : 0)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jwt-decoded.json";
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage("Downloaded");
  };

  const handleDownloadReport = () => {
    const trimmed = token.trim();
    const report = [
      "# JWT Decoder Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Token",
      trimmed ? `\`${trimmed}\`` : "_No token provided_",
      "",
      "## Status",
      `- State: ${stateMessage}`,
      result.tokenType ? `- Type: ${result.tokenType}` : "",
      result.errors.structure ? `- Structure error: ${result.errors.structure}` : "",
      result.errors.header ? `- Header error: ${result.errors.header}` : "",
      result.errors.payload ? `- Payload error: ${result.errors.payload}` : "",
      "",
      "## Header",
      "```json",
      headerText || "{}",
      "```",
      "",
      "## Payload",
      "```json",
      redactMode ? redactedPayloadText || "{}" : payloadText || "{}",
      "```",
      "",
      "## Signature",
      result.signature ? `\`${result.signature}\`` : "_None_",
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jwt-decoder-report.md";
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage("Downloaded report");
  };

  const handleCopyRedacted = async () => {
    if (!redactedPayload) {
      setActionMessage("No payload to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(redactedPayloadText);
      setActionMessage("Copied redacted payload");
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const formatJson = (value: Record<string, unknown> | null) =>
    value ? JSON.stringify(value, null, pretty ? 2 : 0) : "";
  const headerText = useMemo(() => formatJson(result.header), [result.header, pretty]);
  const payloadText = useMemo(() => formatJson(result.payload), [result.payload, pretty]);
  const redactedPayload = useMemo(
    () => (result.payload ? (redactValue(result.payload) as Record<string, unknown>) : null),
    [result.payload]
  );
  const redactedPayloadText = useMemo(() => formatJson(redactedPayload), [redactedPayload, pretty]);
  const payloadDisplayText = redactMode ? redactedPayloadText : payloadText;
  const payloadTreeSource = redactMode ? redactedPayload : result.payload;
  const headerTreeNodes = useMemo(
    () => (result.header ? buildTreeStructure(result.header) : []),
    [result.header]
  );
  const payloadTreeNodes = useMemo(
    () => (payloadTreeSource ? buildTreeStructure(payloadTreeSource) : []),
    [payloadTreeSource]
  );
  const filteredHeaderNodes = useMemo(
    () => filterTreeNodes(headerTreeNodes, claimFilter),
    [headerTreeNodes, claimFilter]
  );
  const filteredPayloadNodes = useMemo(
    () => filterTreeNodes(payloadTreeNodes, claimFilter),
    [payloadTreeNodes, claimFilter]
  );

  const expState = result.payload?.exp ? Number(result.payload.exp) : undefined;
  const iatState = result.payload?.iat ? Number(result.payload.iat) : undefined;
  const nbfState = result.payload?.nbf ? Number(result.payload.nbf) : undefined;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expState ? expState < now : false;
  const notYetValid = nbfState ? nbfState > now : false;
  const issuedInFuture = iatState ? iatState > now + 60 : false;
  const skewedValidity = nbfState && expState ? nbfState > expState : false;
  const longExpiry = expState
    ? (iatState ? expState - iatState : expState - now) > 60 * 60 * 24 * 90
    : false;
  const issuer = typeof result.payload?.iss === "string" ? result.payload.iss : "";
  const issuerLabel = issuer && issuer.startsWith("http") ? issuer : issuer ? `Issuer: ${issuer}` : "";
  const audience = result.payload?.aud;
  const audienceList =
    typeof audience === "string"
      ? [audience]
      : Array.isArray(audience)
        ? audience.filter((item) => typeof item === "string")
        : [];
  const securityWarnings = [
    typeof result.header?.alg === "string" && result.header.alg.toLowerCase() === "none"
      ? "alg is none (unsigned token)."
      : "",
    !expState ? "Missing exp claim." : "",
    longExpiry ? "Expiry is very long (over 90 days)." : "",
    skewedValidity ? "nbf is after exp." : "",
    issuedInFuture ? "iat is in the future (possible clock skew)." : "",
  ].filter(Boolean);
  const jweNotice =
    result.state === "jwe"
      ? "This looks like JWE (encrypted). Payload can’t be decoded without decryption."
      : "";
  const alg = typeof result.header?.alg === "string" ? result.header.alg : "";
  const stateMessage = useMemo(() => getStateLabel(result.state), [result.state]);
  const stateMessageB = useMemo(() => getStateLabel(resultB.state), [resultB.state]);
  const headerDiff = useMemo(() => diffObjects(result.header, resultB.header), [result.header, resultB.header]);
  const payloadDiff = useMemo(
    () => diffObjects(result.payload, resultB.payload),
    [result.payload, resultB.payload]
  );

  useEffect(() => {
    if (alg.startsWith("HS")) {
      setVerificationMode("secret");
      return;
    }
    if (alg.startsWith("RS") || alg.startsWith("ES")) {
      setVerificationMode("publicKey");
    }
  }, [alg]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("jwt-decoder-token");
      if (stored) {
        setToken(stored);
        setRememberToken(true);
      }
    } catch (err) {
      console.error("Failed to read stored token", err);
    }
  }, []);

  useEffect(() => {
    try {
      if (rememberToken) {
        localStorage.setItem("jwt-decoder-token", token);
      } else {
        localStorage.removeItem("jwt-decoder-token");
      }
    } catch (err) {
      console.error("Failed to persist token", err);
    }
  }, [rememberToken, token]);

  const handleClaimCopy = async (path: string[], value: unknown) => {
    try {
      const text = formatCopyValue(value);
      await navigator.clipboard.writeText(text);
      setActionMessage(`Copied ${getJSONPath({}, path)}`);
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleVerify = async () => {
    setVerifyStatus("verifying");
    setVerifyMessage("");

    if (result.state === "empty") {
      setVerifyStatus("unverified");
      setVerifyMessage("Paste a token to verify.");
      return;
    }

    if (result.tokenType !== "JWS") {
      setVerifyStatus("unverified");
      setVerifyMessage("Only JWS signatures can be verified.");
      return;
    }

    if (!alg) {
      setVerifyStatus("unverified");
      setVerifyMessage("Missing alg in header.");
      return;
    }

    if (!result.signingInput || result.parts.length !== 3) {
      setVerifyStatus("unverified");
      setVerifyMessage("Missing signing input.");
      return;
    }

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = decodeBase64Url(result.parts[2] ?? "");
    } catch (err) {
      setVerifyStatus("error");
      setVerifyMessage("Signature is not valid base64url.");
      return;
    }

    try {
      const data = new TextEncoder().encode(result.signingInput);
      const signatureBuffer = toArrayBuffer(signatureBytes);
      const dataBuffer = toArrayBuffer(data);

      if (verificationMode === "secret") {
        if (!["HS256", "HS384", "HS512"].includes(alg)) {
          setVerifyStatus("unverified");
          setVerifyMessage("HMAC verification only supports HS256/384/512.");
          return;
        }
        if (!secret.trim()) {
          setVerifyStatus("unverified");
          setVerifyMessage("Paste a secret to verify.");
          return;
        }
        const hash = alg === "HS256" ? "SHA-256" : alg === "HS384" ? "SHA-384" : "SHA-512";
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: { name: hash } },
          false,
          ["verify"]
        );
        const ok = await crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer);
        setVerifyStatus(ok ? "valid" : "invalid");
        return;
      }

      if (verificationMode === "publicKey") {
        if (!["RS256", "ES256"].includes(alg)) {
          setVerifyStatus("unverified");
          setVerifyMessage("Public key verification only supports RS256/ES256.");
          return;
        }
        if (!publicKeyPem.trim()) {
          setVerifyStatus("unverified");
          setVerifyMessage("Paste a public key (PEM) to verify.");
          return;
        }
        const keyData = pemToArrayBuffer(publicKeyPem);
        const algorithm =
          alg === "RS256"
            ? ({ name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } } as const)
            : ({ name: "ECDSA", namedCurve: "P-256" } as const);
        const key = await crypto.subtle.importKey("spki", keyData, algorithm, false, ["verify"]);
        const verifyAlg = alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" };
        const ok = await crypto.subtle.verify(verifyAlg, key, signatureBuffer, dataBuffer);
        setVerifyStatus(ok ? "valid" : "invalid");
        return;
      }

      if (!jwksUrl.trim()) {
        setVerifyStatus("unverified");
        setVerifyMessage("Provide a JWKS URL to verify.");
        return;
      }
      const kid = typeof result.header?.kid === "string" ? result.header.kid : "";
      if (!kid) {
        setVerifyStatus("unverified");
        setVerifyMessage("Missing kid in header for JWKS lookup.");
        return;
      }
      const response = await fetch(jwksUrl);
      if (!response.ok) {
        setVerifyStatus("error");
        setVerifyMessage("Failed to fetch JWKS.");
        return;
      }
      const jwks = (await response.json()) as { keys?: Array<Record<string, unknown>> };
      const keyData = jwks.keys?.find((key) => (key as { kid?: string }).kid === kid) as
        | JsonWebKey
        | undefined;
      if (!keyData) {
        setVerifyStatus("unverified");
        setVerifyMessage("No matching key found for kid.");
        return;
      }
      if (!["RS256", "ES256"].includes(alg)) {
        setVerifyStatus("unverified");
        setVerifyMessage("JWKS verification only supports RS256/ES256.");
        return;
      }
      const jwkAlg =
        alg === "RS256"
          ? ({ name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } } as const)
          : ({ name: "ECDSA", namedCurve: "P-256" } as const);
      const key = await crypto.subtle.importKey("jwk", keyData, jwkAlg, false, ["verify"]);
      const verifyAlg = alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" };
      const ok = await crypto.subtle.verify(verifyAlg, key, signatureBuffer, dataBuffer);
      setVerifyStatus(ok ? "valid" : "invalid");
    } catch (err) {
      console.error("Verification failed", err);
      setVerifyStatus("error");
      setVerifyMessage("Verification failed. Check inputs and algorithm.");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {stateMessage} {actionMessage} {warning} {result.errors.structure} {result.errors.header}{" "}
        {result.errors.payload} {verifyMessage} {warningB} {resultB.errors.structure}{" "}
        {resultB.errors.header} {resultB.errors.payload}
      </div>
            {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-slate-600" itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" itemProp="item" className="underline underline-offset-4 transition hover:text-slate-900">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="font-medium text-slate-900">
              JWT Decoder
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JWT Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Decode JWT header and payload locally without verifying the signature. Inspect claims and
          expiry quickly.
        </p>
        <p className="text-sm text-slate-600">Note: Signature is not verified. Never paste production secrets.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setToken("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear token input"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={() => setToken(SAMPLE_JWT)}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample JWT"
          >
            <Sparkles className="h-4 w-4" />
            Load sample
          </button>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={pretty}
              onChange={(e) => setPretty(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Pretty print
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={redactMode}
              onChange={(e) => setRedactMode(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Share-safe view
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(e) => setRememberToken(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Remember token
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Diff mode
          </label>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!result.header && !result.payload && !result.signature}
          >
            <Clipboard className="h-4 w-4" />
            Copy all
          </button>
          <button
            onClick={handleCopyCurl}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!token.trim()}
          >
            <Clipboard className="h-4 w-4" />
            Copy as cURL header
          </button>
          <button
            onClick={handleCopyEnv}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!token.trim()}
          >
            <Clipboard className="h-4 w-4" />
            Copy as env var
          </button>
          <button
            onClick={handleCopyRedacted}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!redactedPayload}
          >
            <Clipboard className="h-4 w-4" />
            Copy redacted payload
          </button>
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!result.header && !result.payload && !result.signature}
          >
            <Download className="h-4 w-4" />
            Download JSON
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!token.trim()}
          >
            <Download className="h-4 w-4" />
            Download report
          </button>
        </div>
        <textarea
            className="h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste JWT (header.payload.signature)"
            aria-label="JWT input"
        />
        {result.errors.structure ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {result.errors.structure}
          </p>
        ) : jweNotice ? (
          <p className="text-sm font-medium text-blue-700" role="alert">
            {jweNotice}
          </p>
        ) : warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">Signature is not verified. Avoid pasting secrets from production.</p>
        )}
      </div>

      {compareMode ? (
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Compare token</p>
            <p className="text-xs text-slate-500">Status: {stateMessageB}</p>
          </div>
          <textarea
            className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={tokenB}
            onChange={(event) => setTokenB(event.target.value)}
            placeholder="Paste second JWT to compare"
            aria-label="JWT compare input"
          />
          {resultB.errors.structure ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              {resultB.errors.structure}
            </p>
          ) : warningB ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              {warningB}
            </p>
          ) : (
            <p className="text-sm text-slate-600">Compare header and payload changes across two tokens.</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <button
            onClick={() => setViewMode("formatted")}
            className={`rounded-full px-3 py-1.5 ${
              viewMode === "formatted"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Pretty JSON
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`rounded-full px-3 py-1.5 ${
              viewMode === "tree"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Tree view
          </button>
          <span className="text-xs text-slate-500">Click values to copy</span>
        </div>
        <input
          type="text"
          value={claimFilter}
          onChange={(event) => setClaimFilter(event.target.value)}
          placeholder="Search claims (e.g. role, scope)"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:max-w-sm"
          aria-label="Search claims"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Header</p>
            <button
              onClick={() => handleCopy(result.errors.header ?? headerText, "header")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.header && !result.errors.header}
              aria-label="Copy decoded header"
            >
              {copied === "header" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "header" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="min-h-[160px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Decoded JWT header"
            tabIndex={0}
          >
            {result.errors.header
              ? result.errors.header
              : result.header && viewMode === "formatted"
                ? headerText
                : result.header && viewMode === "tree"
                  ? null
                  : "Header will appear here."}
          </pre>
          {result.header && viewMode === "tree" ? (
            <div className="px-2 pb-4">
              {filteredHeaderNodes.length ? (
                <TreeView
                  nodes={filteredHeaderNodes}
                  onNodeClick={(node) => handleClaimCopy(node.path, node.value)}
                />
              ) : (
                <p className="px-2 text-xs text-slate-500">No matching header claims.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Payload</p>
            <button
              onClick={() => handleCopy(result.errors.payload ?? payloadDisplayText, "payload")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.payload && !result.errors.payload}
              aria-label="Copy decoded payload"
            >
              {copied === "payload" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "payload" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="min-h-[160px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Decoded JWT payload"
            tabIndex={0}
          >
            {result.errors.payload
              ? result.errors.payload
              : result.payload && viewMode === "formatted"
                ? payloadDisplayText
                : result.payload && viewMode === "tree"
                  ? null
                  : "Payload will appear here."}
          </pre>
          {result.payload && viewMode === "tree" ? (
            <div className="px-2 pb-4">
              {filteredPayloadNodes.length ? (
                <TreeView
                  nodes={filteredPayloadNodes}
                  onNodeClick={(node) => handleClaimCopy(node.path, node.value)}
                />
              ) : (
                <p className="px-2 text-xs text-slate-500">No matching payload claims.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {compareMode ? (
        <section className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Diff results</h2>
            <p className="text-xs text-slate-500">Token A vs Token B</p>
          </div>
          {!result.header || !resultB.header ? (
            <p className="text-sm text-slate-600">
              Both tokens need valid headers to compare. Fix any decode errors above.
            </p>
          ) : null}
          {!result.payload || !resultB.payload ? (
            <p className="text-sm text-slate-600">
              Both tokens need decodable payloads to compare (JWE payloads cannot be diffed).
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Header diff</p>
              {headerDiff.length ? (
                <ul className="mt-2 space-y-2 text-xs text-slate-700">
                  {headerDiff.map((entry) => (
                    <li key={`header-${entry.path}`} className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                      <p className="font-semibold text-slate-900">
                        {entry.type === "added" && "Added"}
                        {entry.type === "removed" && "Removed"}
                        {entry.type === "changed" && "Changed"}: {entry.path}
                      </p>
                      <p className="text-slate-600">A: {formatDiffValue(entry.left)}</p>
                      <p className="text-slate-600">B: {formatDiffValue(entry.right)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-600">No header differences detected.</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Payload diff</p>
              {payloadDiff.length ? (
                <ul className="mt-2 space-y-2 text-xs text-slate-700">
                  {payloadDiff.map((entry) => (
                    <li key={`payload-${entry.path}`} className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                      <p className="font-semibold text-slate-900">
                        {entry.type === "added" && "Added"}
                        {entry.type === "removed" && "Removed"}
                        {entry.type === "changed" && "Changed"}: {entry.path}
                      </p>
                      <p className="text-slate-600">A: {formatDiffValue(entry.left)}</p>
                      <p className="text-slate-600">B: {formatDiffValue(entry.right)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-600">No payload differences detected.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-900">Claim highlights</p>
        <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issuer (iss)</p>
            <p className="font-medium text-slate-900">{formatClaim(result.payload?.iss)}</p>
            {issuerLabel ? <p className="text-xs text-slate-600">{issuerLabel}</p> : null}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Subject (sub)</p>
            <p className="font-medium text-slate-900">{formatClaim(result.payload?.sub)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Expires (exp)</p>
            <p className={`font-medium ${isExpired ? "text-rose-700" : "text-slate-900"}`}>
              {result.payload?.exp ? formatDate(Number(result.payload.exp)) : "N/A"}
            </p>
            <p className={`text-xs ${isExpired ? "text-rose-700" : "text-slate-600"}`}>
              {formatRelativeTime(expState)}
            </p>
            {isExpired && <p className="text-xs font-medium text-rose-700">Expired</p>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Not before (nbf)</p>
            <p className={`font-medium ${notYetValid ? "text-amber-700" : "text-slate-900"}`}>
              {result.payload?.nbf ? formatDate(Number(result.payload.nbf)) : "N/A"}
            </p>
            <p className={`text-xs ${notYetValid ? "text-amber-700" : "text-slate-600"}`}>
              {formatRelativeTime(nbfState)}
            </p>
            {notYetValid && <p className="text-xs font-medium text-amber-700">Not yet valid</p>}
          </div>
        </div>
        <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issued at (iat)</p>
            <p className="font-medium text-slate-900">
              {result.payload?.iat ? formatDate(Number(result.payload.iat)) : "N/A"}
            </p>
            <p className={`text-xs ${issuedInFuture ? "text-amber-700" : "text-slate-600"}`}>
              {formatRelativeTime(iatState)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Audience (aud)</p>
            <p className="font-medium text-slate-900">{audienceList.length ? "Present" : "N/A"}</p>
            {audienceList.length ? (
              <p className="text-xs text-slate-600">
                {Array.isArray(audience) ? "Array" : "String"} • {audienceList.join(", ")}
              </p>
            ) : null}
            {audienceList.length ? (
              <p className="text-xs text-slate-500">Verify this matches your expected audience.</p>
            ) : null}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Clock sanity</p>
            <p className="font-medium text-slate-900">
              {skewedValidity || issuedInFuture ? "Check" : "OK"}
            </p>
            {skewedValidity && <p className="text-xs text-rose-700">nbf is after exp</p>}
            {issuedInFuture && <p className="text-xs text-amber-700">iat is in the future</p>}
          </div>
        </div>
        {securityWarnings.length ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold text-amber-900">Security lint</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {securityWarnings.map((warningText) => (
                <li key={warningText}>{warningText}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-slate-600">Signature not verified. Only decode non-sensitive tokens.</p>
        {result.tokenType === "JWS" && result.signature ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Signature (not verified)</p>
            <p className="break-all font-mono text-[11px] text-slate-700">{result.signature}</p>
          </div>
        ) : null}
      </div>

      <section className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Signature verification</h2>
          <p className="text-xs text-slate-500">Runs locally in your browser</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Algorithm (alg)</p>
          <p className="font-medium text-slate-900">{alg || "Unknown"}</p>
        </div>
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="radio"
              name="verify-mode"
              value="secret"
              checked={verificationMode === "secret"}
              onChange={() => setVerificationMode("secret")}
            />
            HMAC secret (HS256/384/512)
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="radio"
              name="verify-mode"
              value="publicKey"
              checked={verificationMode === "publicKey"}
              onChange={() => setVerificationMode("publicKey")}
            />
            Public key (RS256/ES256)
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="radio"
              name="verify-mode"
              value="jwks"
              checked={verificationMode === "jwks"}
              onChange={() => setVerificationMode("jwks")}
            />
            JWKS URL (by kid)
          </label>
        </div>
        {verificationMode === "secret" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-700">
              Warning: Do not paste production secrets. Verification happens locally but secrets remain sensitive.
            </p>
            <textarea
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              placeholder="Paste HMAC secret"
              aria-label="HMAC secret"
            />
          </div>
        ) : null}
        {verificationMode === "publicKey" ? (
          <textarea
            value={publicKeyPem}
            onChange={(event) => setPublicKeyPem(event.target.value)}
            className="h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            placeholder="-----BEGIN PUBLIC KEY-----"
            aria-label="Public key PEM"
          />
        ) : null}
        {verificationMode === "jwks" ? (
          <input
            type="url"
            value={jwksUrl}
            onChange={(event) => setJwksUrl(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            placeholder="https://example.com/.well-known/jwks.json"
            aria-label="JWKS URL"
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleVerify}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={verifyStatus === "verifying"}
          >
            {verifyStatus === "verifying" ? "Verifying..." : "Verify signature"}
          </button>
          <div className="text-sm font-medium">
            {verifyStatus === "valid" && <span className="text-emerald-700">✅ Valid</span>}
            {verifyStatus === "invalid" && <span className="text-rose-700">❌ Invalid</span>}
            {verifyStatus === "unverified" && (
              <span className="text-amber-700">⚠️ Cannot verify</span>
            )}
            {verifyStatus === "error" && <span className="text-rose-700">⚠️ Error</span>}
            {verifyStatus === "idle" && <span className="text-slate-500">No verification yet</span>}
          </div>
        </div>
        {verifyMessage ? <p className="text-xs text-slate-600">{verifyMessage}</p> : null}
      </section>
      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste a JWT or load the sample; header/payload decode automatically.</li>
          <li>Use “Pretty print” to toggle formatting; copy header/payload or download all JSON.</li>
          <li>Remember: signature is not verified—never paste sensitive production tokens.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is decoding private?</summary>
            <p className="mt-2 text-slate-700">Yes. Decoding happens in your browser; tokens are not uploaded.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is the signature checked?</summary>
            <p className="mt-2 text-slate-700">No. This tool only decodes header/payload. Do not paste sensitive tokens.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I export the decoded data?</summary>
            <p className="mt-2 text-slate-700">Yes. Copy header/payload individually or download the combined JSON.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
