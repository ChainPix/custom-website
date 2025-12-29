"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

import {
  algConfig,
  decodeToken,
  deriveAlgFromJwk,
  fromBase64Url,
  getEcdsaSize,
  JwtAlg,
  KeyEntry,
  NonHmacAlg,
  parseJsonWithPosition,
  signHmac,
  signWithKey,
  stripPrivateJwk,
  joseToDer,
  arrayBufferToPem,
  pemToArrayBuffer,
} from "./utils";

type JwtPreset = {
  id: string;
  name: string;
  payloadText: string;
  algorithm: JwtAlg;
  secret: string;
  claims: {
    sub: string;
    iss: string;
    aud: string;
    jti: string;
    iat: number | "";
    nbf: number | "";
    exp: number | "";
  };
};

const encoder = new TextEncoder();

const formatDateTime = (seconds: number) => new Date(seconds * 1000).toLocaleString();

const formatCountdown = (target: number, now: number) => {
  const diff = target - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  const parts = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    !days && !hours ? `${seconds}s` : "",
  ].filter(Boolean);
  const label = parts.join(" ") || "0s";
  return diff >= 0 ? `in ${label}` : `${label} ago`;
};

const getByteLength = (value: string) => encoder.encode(value).length;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export default function JwtGeneratorClient() {
  const [payloadText, setPayloadText] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
  const [algorithm, setAlgorithm] = useState<JwtAlg>("HS256");
  const [secret, setSecret] = useState("");
  const [revealSecret, setRevealSecret] = useState(false);
  const [clearSecretOnExit, setClearSecretOnExit] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("jwt-clear-secret-on-exit");
    return stored ? stored === "true" : true;
  });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "info" | "success" | "error" }>({
    message: "",
    tone: "info",
  });
  const [secretWarning, setSecretWarning] = useState("");
  const [claimSub, setClaimSub] = useState("");
  const [claimIss, setClaimIss] = useState("");
  const [claimAud, setClaimAud] = useState("");
  const [claimJti, setClaimJti] = useState("");
  const [claimIat, setClaimIat] = useState<number | "">("");
  const [claimNbf, setClaimNbf] = useState<number | "">("");
  const [claimExp, setClaimExp] = useState<number | "">("");
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const [autoRegenerate, setAutoRegenerate] = useState(false);
  const [keyEntries, setKeyEntries] = useState<KeyEntry[]>([]);
  const [activeKeyId, setActiveKeyId] = useState("");
  const [jwksText, setJwksText] = useState("");
  const [jwksError, setJwksError] = useState("");
  const [pemText, setPemText] = useState("");
  const [pemError, setPemError] = useState("");
  const [secretLength, setSecretLength] = useState(32);
  const [secretCharsets, setSecretCharsets] = useState({
    lower: true,
    upper: true,
    number: true,
    symbol: false,
  });
  const [verifyTokenText, setVerifyTokenText] = useState("");
  const [verifyAlgorithm, setVerifyAlgorithm] = useState<JwtAlg>("HS256");
  const [verifySecret, setVerifySecret] = useState("");
  const [verifyResult, setVerifyResult] = useState<"valid" | "invalid" | "">("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyKeySource, setVerifyKeySource] = useState<"active" | "jwks">("active");
  const [jwksVerifyText, setJwksVerifyText] = useState("");
  const [jwksVerifyKeys, setJwksVerifyKeys] = useState<KeyEntry[]>([]);
  const [verifyKid, setVerifyKid] = useState("");
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<JwtPreset[]>([]);
  const [presetError, setPresetError] = useState("");
  const [copyStatus, setCopyStatus] = useState({
    token: false,
    header: false,
    payload: false,
    headerSegment: false,
    payloadSegment: false,
    signatureSegment: false,
  });
  const debounceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const generationIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("jwt-clear-secret-on-exit", String(clearSecretOnExit));
    if (clearSecretOnExit) {
      window.sessionStorage.removeItem("jwt-secret");
    }
  }, [clearSecretOnExit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (clearSecretOnExit) {
      window.sessionStorage.removeItem("jwt-secret");
      return;
    }
    window.sessionStorage.setItem("jwt-secret", secret);
  }, [secret, clearSecretOnExit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!clearSecretOnExit) {
      const storedSecret = window.sessionStorage.getItem("jwt-secret");
      if (storedSecret) {
        setSecret(storedSecret);
      }
    }
  }, [clearSecretOnExit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clearStoredSecret = () => {
      if (clearSecretOnExit) {
        window.sessionStorage.removeItem("jwt-secret");
      }
    };
    window.addEventListener("beforeunload", clearStoredSecret);
    window.addEventListener("pagehide", clearStoredSecret);
    return () => {
      window.removeEventListener("beforeunload", clearStoredSecret);
      window.removeEventListener("pagehide", clearStoredSecret);
    };
  }, [clearSecretOnExit]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("jwt-generator-presets");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as JwtPreset[];
      if (Array.isArray(parsed)) {
        setPresets(parsed);
      }
    } catch (err) {
      console.error("Preset load error", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("jwt-generator-presets", JSON.stringify(presets));
  }, [presets]);

  const showToast = useCallback((message: string, tone: "info" | "success" | "error" = "info") => {
    setToast({ message, tone });
  }, []);

  const triggerCopyStatus = useCallback((key: keyof typeof copyStatus) => {
    setCopyStatus((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setCopyStatus((prev) => ({ ...prev, [key]: false }));
    }, 1200);
  }, []);

  const handleReset = useCallback(() => {
    setPayloadText('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
    setAlgorithm("HS256");
    setSecret("");
    setClaimSub("");
    setClaimIss("");
    setClaimAud("");
    setClaimJti("");
    setClaimIat("");
    setClaimNbf("");
    setClaimExp("");
    setToken("");
    setError("");
    showToast("Reset to defaults", "info");
  }, [showToast]);

  const handleLoadAdminSample = useCallback(() => {
    setPayloadText('{\n  "sub": "42",\n  "role": "admin"\n}');
    setAlgorithm("HS256");
    setSecret("sample-secret-123");
    showToast("Loaded sample", "info");
  }, [showToast]);

  const handleLoadGuestSample = useCallback(() => {
    setPayloadText('{\n  "user": "guest",\n  "scope": ["read"]\n}');
    setAlgorithm("HS256");
    setSecret("guest-secret");
    showToast("Loaded sample", "info");
  }, [showToast]);

  const handleClearSecret = useCallback(() => {
    setSecret("");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("jwt-secret");
    }
    showToast("Cleared secret", "info");
  }, [showToast]);

  const keysForAlgorithm = useMemo(() => keyEntries.filter((entry) => entry.alg === algorithm), [keyEntries, algorithm]);
  const activeKey = useMemo(() => keyEntries.find((entry) => entry.id === activeKeyId) ?? null, [keyEntries, activeKeyId]);
  const payloadParse = useMemo(() => parseJsonWithPosition(payloadText), [payloadText]);
  const userPayload = useMemo(() => (isRecord(payloadParse.parsed) ? payloadParse.parsed : null), [payloadParse]);
  const verifyDecoded = useMemo(() => decodeToken(verifyTokenText), [verifyTokenText]);

  const claimAdditions = useMemo(() => {
    const additions: Record<string, unknown> = {};
    if (claimSub) additions.sub = claimSub;
    if (claimIss) additions.iss = claimIss;
    if (claimAud) additions.aud = claimAud;
    if (claimJti) additions.jti = claimJti;
    if (claimIat !== "" && Number.isFinite(Number(claimIat))) additions.iat = Number(claimIat);
    if (claimNbf !== "" && Number.isFinite(Number(claimNbf))) additions.nbf = Number(claimNbf);
    if (claimExp !== "" && Number.isFinite(Number(claimExp))) additions.exp = Number(claimExp);
    return additions;
  }, [claimSub, claimIss, claimAud, claimJti, claimIat, claimNbf, claimExp]);

  const finalPayloadPreview = useMemo(
    () => (userPayload ? { ...userPayload, ...claimAdditions } : null),
    [userPayload, claimAdditions],
  );

  const payloadDiffInfo = useMemo(() => {
    if (!userPayload) return { added: [] as string[], overridden: [] as string[] };
    const added: string[] = [];
    const overridden: string[] = [];
    Object.keys(claimAdditions).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(userPayload, key)) {
        overridden.push(key);
      } else {
        added.push(key);
      }
    });
    return { added, overridden };
  }, [userPayload, claimAdditions]);

  const claimWarnings = useMemo(() => {
    if (!finalPayloadPreview) return [];
    const warnings: string[] = [];
    const getNumberWarning = (value: unknown, label: string) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        warnings.push(`${label} should be a number (epoch seconds).`);
      } else if (!Number.isInteger(value)) {
        warnings.push(`${label} should be an integer (epoch seconds).`);
      }
    };
    if ("sub" in finalPayloadPreview && typeof finalPayloadPreview.sub !== "string") {
      warnings.push("sub should be a string.");
    }
    if ("iss" in finalPayloadPreview && typeof finalPayloadPreview.iss !== "string") {
      warnings.push("iss should be a string.");
    }
    if ("jti" in finalPayloadPreview && typeof finalPayloadPreview.jti !== "string") {
      warnings.push("jti should be a string.");
    }
    if ("aud" in finalPayloadPreview) {
      const aud = finalPayloadPreview.aud;
      if (typeof aud !== "string" && !(Array.isArray(aud) && aud.every((item) => typeof item === "string"))) {
        warnings.push("aud should be a string or an array of strings.");
      }
    }
    if ("iat" in finalPayloadPreview) getNumberWarning(finalPayloadPreview.iat, "iat");
    if ("nbf" in finalPayloadPreview) getNumberWarning(finalPayloadPreview.nbf, "nbf");
    if ("exp" in finalPayloadPreview) getNumberWarning(finalPayloadPreview.exp, "exp");
    if (
      typeof finalPayloadPreview.iat === "number" &&
      typeof finalPayloadPreview.exp === "number" &&
      finalPayloadPreview.exp <= finalPayloadPreview.iat
    ) {
      warnings.push("exp should be after iat.");
    }
    if (
      typeof finalPayloadPreview.nbf === "number" &&
      typeof finalPayloadPreview.exp === "number" &&
      finalPayloadPreview.exp <= finalPayloadPreview.nbf
    ) {
      warnings.push("exp should be after nbf.");
    }
    if (typeof finalPayloadPreview.exp === "number" && finalPayloadPreview.exp < nowSeconds) {
      warnings.push("exp is in the past.");
    }
    return warnings;
  }, [finalPayloadPreview, nowSeconds]);

  const tokenSegments = useMemo(() => {
    const [header = "", payload = "", signature = ""] = token.split(".");
    return { header, payload, signature };
  }, [token]);

  const tokenStats = useMemo(() => {
    if (!token) return null;
    let headerBytes = 0;
    let payloadBytes = 0;
    let signatureBytes = 0;
    try {
      headerBytes = tokenSegments.header ? fromBase64Url(tokenSegments.header).length : 0;
      payloadBytes = tokenSegments.payload ? fromBase64Url(tokenSegments.payload).length : 0;
      signatureBytes = tokenSegments.signature ? fromBase64Url(tokenSegments.signature).length : 0;
    } catch {
      return null;
    }
    return {
      tokenBytes: getByteLength(token),
      headerBytes,
      payloadBytes,
      signatureBytes,
    };
  }, [token, tokenSegments]);

  useEffect(() => {
    if (algorithm === "HS256" || algorithm === "HS384" || algorithm === "HS512") return;
    const matchingActive = activeKey && activeKey.alg === algorithm;
    if (matchingActive) return;
    const fallback = keyEntries.find((entry) => entry.alg === algorithm);
    setActiveKeyId(fallback ? fallback.id : "");
  }, [algorithm, activeKey, keyEntries]);

  useEffect(() => {
    if (verifyKeySource !== "active") return;
    if (activeKey && verifyAlgorithm !== activeKey.alg) {
      setVerifyAlgorithm(activeKey.alg);
    }
  }, [verifyKeySource, activeKey, verifyAlgorithm]);

  const handleGenerateKey = useCallback(async () => {
    if (algorithm === "HS256" || algorithm === "HS384" || algorithm === "HS512") return;
    setJwksError("");
    try {
      const currentAlg = algorithm as NonHmacAlg;
      const config = algConfig[currentAlg];
      const keyPair =
        currentAlg === "RS256" || currentAlg === "RS384" || currentAlg === "RS512"
          ? await crypto.subtle.generateKey(
              {
                name: config.name,
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: config.hash,
              },
              true,
              ["sign", "verify"],
            )
          : currentAlg === "ES256" || currentAlg === "ES384" || currentAlg === "ES512"
            ? await crypto.subtle.generateKey(
                {
                  name: config.name,
                  namedCurve: config.namedCurve,
                },
                true,
                ["sign", "verify"],
              )
            : await crypto.subtle.generateKey({ name: config.name }, true, ["sign", "verify"]);
      const id = crypto.randomUUID();
      const entry: KeyEntry = {
        id,
        kid: id,
        alg: currentAlg,
        kty: config.kty,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
      };
      setKeyEntries((prev) => [...prev, entry]);
      setActiveKeyId(id);
      showToast(`Generated ${currentAlg} key`, "success");
    } catch (err) {
      console.error("Key generation error", err);
      setJwksError(`Failed to generate ${algorithm} key. This browser may not support it.`);
    }
  }, [algorithm, showToast]);

  const handleImportJwks = useCallback(async () => {
    setJwksError("");
    try {
      const parsed = JSON.parse(jwksText);
      const keys = Array.isArray(parsed?.keys) ? parsed.keys : [parsed];
      const imported: KeyEntry[] = [];
      for (const jwk of keys) {
        const alg = deriveAlgFromJwk(jwk);
        if (!alg) continue;
        const config = algConfig[alg];
        const publicJwk = stripPrivateJwk(jwk);
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          publicJwk,
          config.kty === "RSA"
            ? { name: config.name, hash: config.hash }
            : config.kty === "EC"
              ? { name: config.name, namedCurve: config.namedCurve }
              : { name: config.name },
          true,
          ["verify"],
        );
        let privateKey: CryptoKey | undefined;
        if (jwk.d) {
          privateKey = await crypto.subtle.importKey(
            "jwk",
            jwk,
            config.kty === "RSA"
              ? { name: config.name, hash: config.hash }
              : config.kty === "EC"
                ? { name: config.name, namedCurve: config.namedCurve }
                : { name: config.name },
            true,
            ["sign"],
          );
        }
        const id = jwk.kid ?? crypto.randomUUID();
        imported.push({
          id,
          kid: jwk.kid ?? id,
          alg,
          kty: config.kty,
          publicKey,
          privateKey,
        });
      }
      if (!imported.length) {
        setJwksError("No compatible keys found in JWKS.");
        return;
      }
      setKeyEntries((prev) => [...prev, ...imported]);
      setActiveKeyId(imported[0].id);
      showToast(`Imported ${imported.length} key${imported.length === 1 ? "" : "s"}`, "success");
    } catch (err) {
      console.error("JWKS import error", err);
      setJwksError("Invalid JWKS JSON or unsupported key format.");
    }
  }, [jwksText, showToast]);

  const handleExportJwks = useCallback(
    async (includePrivate: boolean) => {
      setJwksError("");
      try {
        const keys = await Promise.all(
          keyEntries.map(async (entry) => {
          const key = includePrivate && entry.privateKey ? entry.privateKey : entry.publicKey;
          const jwk = await crypto.subtle.exportKey("jwk", key);
          return { ...jwk, kid: entry.kid, alg: entry.alg, use: "sig" };
        }),
        );
        const jwks = JSON.stringify({ keys }, null, 2);
        setJwksText(jwks);
        showToast(`Exported ${includePrivate ? "private" : "public"} JWKS`, "success");
      } catch (err) {
        console.error("JWKS export error", err);
        setJwksError("Failed to export JWKS.");
      }
    },
    [keyEntries, showToast],
  );

  const handleRemoveKey = useCallback(
    (id: string) => {
      setKeyEntries((prev) => prev.filter((entry) => entry.id !== id));
      if (activeKeyId === id) {
        setActiveKeyId("");
      }
      showToast("Removed key", "info");
    },
    [activeKeyId, showToast],
  );

  const handleSetIatNow = useCallback(() => setClaimIat(nowSeconds), [nowSeconds]);
  const handleSetNbfOffset = useCallback((offsetSeconds: number) => setClaimNbf(nowSeconds + offsetSeconds), [nowSeconds]);
  const handleSetExpOffset = useCallback((offsetSeconds: number) => setClaimExp(nowSeconds + offsetSeconds), [nowSeconds]);

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) {
      setPresetError("Preset name is required.");
      return;
    }
    const preset: JwtPreset = {
      id: crypto.randomUUID(),
      name,
      payloadText,
      algorithm,
      secret,
      claims: {
        sub: claimSub,
        iss: claimIss,
        aud: claimAud,
        jti: claimJti,
        iat: claimIat,
        nbf: claimNbf,
        exp: claimExp,
      },
    };
    setPresets((prev) => [preset, ...prev]);
    setPresetName("");
    setPresetError("");
    showToast("Saved preset", "success");
  }, [
    presetName,
    payloadText,
    algorithm,
    secret,
    claimSub,
    claimIss,
    claimAud,
    claimJti,
    claimIat,
    claimNbf,
    claimExp,
    showToast,
  ]);

  const handleLoadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((item) => item.id === id);
      if (!preset) return;
      setPayloadText(preset.payloadText);
    setAlgorithm(preset.algorithm);
    setSecret(preset.secret);
    setClaimSub(preset.claims.sub);
    setClaimIss(preset.claims.iss);
    setClaimAud(preset.claims.aud);
    setClaimJti(preset.claims.jti);
    setClaimIat(preset.claims.iat);
      setClaimNbf(preset.claims.nbf);
      setClaimExp(preset.claims.exp);
      showToast(`Loaded preset ${preset.name}`, "success");
    },
    [presets, showToast],
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      setPresets((prev) => prev.filter((item) => item.id !== id));
      showToast("Deleted preset", "info");
    },
    [showToast],
  );

  const handleGenerateSecret = useCallback(() => {
    const charset = [
      secretCharsets.lower ? "abcdefghijklmnopqrstuvwxyz" : "",
      secretCharsets.upper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "",
      secretCharsets.number ? "0123456789" : "",
      secretCharsets.symbol ? "!@#$%^&*()-_=+[]{};:,.<>?" : "",
    ]
      .filter(Boolean)
      .join("");
    if (!charset) {
      setSecretWarning("Select at least one charset to generate a secret.");
      return;
    }
    const length = Math.max(8, Math.min(128, Number(secretLength) || 32));
    const random = new Uint8Array(length);
    crypto.getRandomValues(random);
    const value = Array.from(random, (byte) => charset[byte % charset.length]).join("");
    setSecret(value);
    showToast("Generated secret", "success");
  }, [secretCharsets.lower, secretCharsets.number, secretCharsets.symbol, secretCharsets.upper, secretLength, showToast]);

  const importKeyFromPem = async (pem: string, alg: NonHmacAlg, kind: "public" | "private") => {
    const buffer = pemToArrayBuffer(pem);
    if (!buffer) throw new Error("Invalid PEM input.");
    const config = algConfig[alg];
    const format = kind === "public" ? "spki" : "pkcs8";
    const usages = kind === "public" ? ["verify"] : ["sign"];
    return crypto.subtle.importKey(
      format,
      buffer,
      config.kty === "RSA"
        ? { name: config.name, hash: config.hash }
        : config.kty === "EC"
          ? { name: config.name, namedCurve: config.namedCurve }
          : { name: config.name },
      true,
      usages,
    );
  };

  const handleImportPem = useCallback(
    async (kind: "public" | "private") => {
      if (algorithm === "HS256" || algorithm === "HS384" || algorithm === "HS512") return;
      setPemError("");
      try {
        const currentAlg = algorithm as NonHmacAlg;
      const key = await importKeyFromPem(pemText, currentAlg, kind);
      let publicKey: CryptoKey;
      if (kind === "private") {
        const jwk = await crypto.subtle.exportKey("jwk", key);
        const publicJwk = stripPrivateJwk(jwk);
        const config = algConfig[currentAlg];
        publicKey = await crypto.subtle.importKey(
          "jwk",
          publicJwk,
          config.kty === "RSA"
            ? { name: config.name, hash: config.hash }
            : config.kty === "EC"
              ? { name: config.name, namedCurve: config.namedCurve }
              : { name: config.name },
          true,
          ["verify"],
        );
      } else {
        publicKey = key;
      }
      const id = crypto.randomUUID();
      const entry: KeyEntry = {
        id,
        kid: id,
        alg: currentAlg,
        kty: algConfig[currentAlg].kty,
        publicKey,
        privateKey: kind === "private" ? key : undefined,
      };
      setKeyEntries((prev) => [...prev, entry]);
      setActiveKeyId(id);
      showToast(`Imported ${kind} PEM`, "success");
    } catch (err) {
      console.error("PEM import error", err);
      setPemError("Failed to import PEM for the selected algorithm.");
    }
    },
    [algorithm, pemText, showToast],
  );

  const handleExportPem = useCallback(
    async (kind: "public" | "private") => {
      if (!activeKey) return;
      setPemError("");
      try {
        const key = kind === "private" ? activeKey.privateKey : activeKey.publicKey;
      if (!key) {
        setPemError("No private key available for export.");
        return;
      }
      const format = kind === "private" ? "pkcs8" : "spki";
      const label = kind === "private" ? "PRIVATE KEY" : "PUBLIC KEY";
      const buffer = await crypto.subtle.exportKey(format, key);
      setPemText(arrayBufferToPem(buffer, label));
      showToast(`Exported ${kind} PEM`, "success");
    } catch (err) {
      console.error("PEM export error", err);
      setPemError("Failed to export PEM.");
    }
    },
    [activeKey, showToast],
  );

  const handleLoadVerifyJwks = useCallback(async () => {
    setVerifyError("");
    try {
      const parsed = JSON.parse(jwksVerifyText);
      const keys = Array.isArray(parsed?.keys) ? parsed.keys : [parsed];
      const imported: KeyEntry[] = [];
      for (const jwk of keys) {
        const alg = deriveAlgFromJwk(jwk);
        if (!alg) continue;
        const config = algConfig[alg];
        const publicJwk = stripPrivateJwk(jwk);
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          publicJwk,
          config.kty === "RSA"
            ? { name: config.name, hash: config.hash }
            : config.kty === "EC"
              ? { name: config.name, namedCurve: config.namedCurve }
              : { name: config.name },
          true,
          ["verify"],
        );
        const id = jwk.kid ?? crypto.randomUUID();
        imported.push({
          id,
          kid: jwk.kid ?? id,
          alg,
          kty: config.kty,
          publicKey,
        });
      }
      if (!imported.length) {
        setVerifyError("No compatible JWKS keys found.");
        return;
      }
      setJwksVerifyKeys(imported);
      setVerifyKid(imported[0].kid);
      setVerifyAlgorithm(imported[0].alg);
      setVerifyKeySource("jwks");
      showToast("Loaded JWKS for verification", "success");
    } catch (err) {
      console.error("Verify JWKS error", err);
      setVerifyError("Invalid JWKS JSON or unsupported key format.");
    }
  }, [jwksVerifyText, showToast]);

  const handleVerify = useCallback(async () => {
    setVerifyError("");
    setVerifyResult("");
    try {
      const [headerB64, payloadB64, sigB64] = verifyTokenText.split(".");
      if (!headerB64 || !payloadB64 || !sigB64) {
        setVerifyError("Token must have header.payload.signature.");
        return;
      }
      if (!/^[A-Za-z0-9_-]+$/.test(sigB64)) {
        setVerifyError("Signature is not valid base64url.");
        return;
      }
      const data = `${headerB64}.${payloadB64}`;
      if (verifyAlgorithm === "HS256" || verifyAlgorithm === "HS384" || verifyAlgorithm === "HS512") {
        const hash = verifyAlgorithm === "HS384" ? "SHA-384" : verifyAlgorithm === "HS512" ? "SHA-512" : "SHA-256";
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(verifySecret),
          { name: "HMAC", hash },
          false,
          ["verify"],
        );
        const signature = fromBase64Url(sigB64);
        const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(data));
        setVerifyResult(valid ? "valid" : "invalid");
        return;
      }
      const config = algConfig[verifyAlgorithm as NonHmacAlg];
      const signatureRaw = fromBase64Url(sigB64);
      if (config.kty === "EC") {
        const expected = getEcdsaSize(verifyAlgorithm as NonHmacAlg) * 2;
        if (signatureRaw.length !== expected) {
          setVerifyError("Invalid ECDSA signature length.");
          return;
        }
      }
      const signature =
        config.kty === "EC" ? joseToDer(signatureRaw, getEcdsaSize(verifyAlgorithm as NonHmacAlg)) : signatureRaw;
      const key =
        verifyKeySource === "jwks"
          ? jwksVerifyKeys.find((entry) => entry.kid === verifyKid)?.publicKey
          : activeKey?.publicKey;
      if (!key) {
        setVerifyError("Select a public key to verify.");
        return;
      }
      const verifyAlg =
        config.kty === "RSA"
          ? { name: config.name }
          : config.kty === "EC"
            ? { name: config.name, hash: config.hash }
            : { name: config.name };
      const valid = await crypto.subtle.verify(verifyAlg, key, signature, encoder.encode(data));
      setVerifyResult(valid ? "valid" : "invalid");
    } catch (err) {
      console.error("Verify error", err);
      setVerifyError("Verification failed.");
    }
  }, [verifyAlgorithm, verifyKeySource, verifyKid, verifySecret, verifyTokenText, jwksVerifyKeys, activeKey]);

  const decoded = useMemo(() => decodeToken(token), [token]);

  const handleGenerate = useCallback(async (requestId?: number) => {
    const activeId = requestId ?? (generationIdRef.current += 1);
    if (requestId && generationIdRef.current !== requestId) return;
    try {
      if (payloadParse.error) {
        throw new Error(payloadParse.error);
      }
      if (!userPayload) {
        throw new Error("Payload must be a JSON object.");
      }
      if (algorithm === "HS256" || algorithm === "HS384" || algorithm === "HS512") {
        if (!secret || secret.length < 8) {
          setSecretWarning("Secret is short; use at least 8+ characters.");
        } else {
          setSecretWarning("");
        }
      } else {
        setSecretWarning("");
      }
      const finalPayloadValue = { ...userPayload, ...claimAdditions };
      let signed = "";
      if (algorithm === "HS256" || algorithm === "HS384" || algorithm === "HS512") {
        signed = await signHmac(finalPayloadValue, secret || "secret", algorithm);
      } else {
        if (!activeKey || activeKey.alg !== algorithm) {
          throw new Error(`No ${algorithm} key selected.`);
        }
        signed = await signWithKey(finalPayloadValue, activeKey);
      }
      if (generationIdRef.current !== activeId) return;
      setToken(signed);
      setError("");
      showToast("JWT generated", "success");
    } catch (err) {
      if (generationIdRef.current !== activeId) return;
      console.error("JWT generate error", err);
      setError(err instanceof Error ? err.message : "Invalid payload JSON or signing failed.");
      setToken("");
      showToast("Generation failed", "error");
    }
  }, [algorithm, activeKey, claimAdditions, payloadParse.error, secret, showToast, userPayload]);

  useEffect(() => {
    if (!autoRegenerate) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      generationIdRef.current += 1;
      return;
    }
    const requestId = (generationIdRef.current += 1);
    debounceTimerRef.current = window.setTimeout(() => {
      handleGenerate(requestId);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    payloadText,
    secret,
    claimSub,
    claimIss,
    claimAud,
    claimJti,
    claimIat,
    claimNbf,
    claimExp,
    algorithm,
    activeKeyId,
    autoRegenerate,
  ]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(token);
      triggerCopyStatus("token");
      showToast("Copied token", "success");
    } catch (err) {
      console.error("Copy failed", err);
      showToast("Copy failed", "error");
    }
  }, [token, triggerCopyStatus, showToast]);

  const handleCopyEnvSnippet = useCallback(async () => {
    if (!token) return;
    try {
      const snippet = `JWT_TOKEN="${token}"\nJWT_ALG="${algorithm}"`;
      await navigator.clipboard.writeText(snippet);
      showToast("Copied .env snippet", "success");
    } catch (err) {
      console.error("Copy .env failed", err);
      showToast("Copy failed", "error");
    }
  }, [algorithm, token, showToast]);

  const handleCopyAuthHeader = useCallback(async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(`Authorization: Bearer ${token}`);
      showToast("Copied Authorization header", "success");
    } catch (err) {
      console.error("Copy header failed", err);
      showToast("Copy failed", "error");
    }
  }, [token, showToast]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {toast.message} {error} {secretWarning}
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
              JWT Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">JWT Generator</h1>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Runs locally
          </span>
        </div>
        <p className="max-w-3xl text-base text-slate-700">
          Create and decode JWTs locally using HS/RS/ES algorithms and EdDSA. Provide payload JSON and signing keys.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT input and signing options">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Generate JWT"
            >
              Generate JWT
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Reset payload and secret"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={autoRegenerate}
                onChange={(e) => setAutoRegenerate(e.target.checked)}
              />
              Auto-regenerate
            </label>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Samples:</span>
            <button
              type="button"
              onClick={handleLoadAdminSample}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Admin sample
            </button>
            <button
              type="button"
              onClick={handleLoadGuestSample}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Guest sample
            </button>
          </div>
          <label className="block text-sm font-semibold text-slate-900">
            Algorithm
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as JwtAlg)}
            >
              <option value="HS256">HS256 (HMAC)</option>
              <option value="HS384">HS384 (HMAC)</option>
              <option value="HS512">HS512 (HMAC)</option>
              <option value="RS256">RS256 (RSA)</option>
              <option value="RS384">RS384 (RSA)</option>
              <option value="RS512">RS512 (RSA)</option>
              <option value="ES256">ES256 (ECDSA)</option>
              <option value="ES384">ES384 (ECDSA)</option>
              <option value="ES512">ES512 (ECDSA)</option>
              <option value="EdDSA">EdDSA (Ed25519)</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-900">
            Payload (JSON)
            <textarea
              className="mt-2 h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              spellCheck={false}
            />
            {payloadParse.error ? (
              <p className="mt-2 text-xs font-medium text-amber-600">{payloadParse.error}</p>
            ) : null}
          </label>
          {algorithm === "HS256" || algorithm === "HS384" || algorithm === "HS512" ? (
            <label className="block text-sm font-semibold text-slate-900">
              Secret
              <input
                type={revealSecret ? "text" : "password"}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="your-secret"
                autoComplete="new-password"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setRevealSecret((prev) => !prev)}
                  className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  aria-pressed={revealSecret}
                >
                  {revealSecret ? "Hide secret" : "Reveal secret"}
                </button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={clearSecretOnExit}
                    onChange={(e) => setClearSecretOnExit(e.target.checked)}
                  />
                  Never persist secrets (recommended)
                </label>
                <button
                  type="button"
                  onClick={handleClearSecret}
                  className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Clear secret
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <label className="flex items-center gap-2">
                  Length
                  <input
                    type="number"
                    min={8}
                    max={128}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={secretLength}
                    onChange={(e) => setSecretLength(Number(e.target.value))}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={secretCharsets.lower}
                    onChange={(e) => setSecretCharsets((prev) => ({ ...prev, lower: e.target.checked }))}
                  />
                  a-z
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={secretCharsets.upper}
                    onChange={(e) => setSecretCharsets((prev) => ({ ...prev, upper: e.target.checked }))}
                  />
                  A-Z
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={secretCharsets.number}
                    onChange={(e) => setSecretCharsets((prev) => ({ ...prev, number: e.target.checked }))}
                  />
                  0-9
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={secretCharsets.symbol}
                    onChange={(e) => setSecretCharsets((prev) => ({ ...prev, symbol: e.target.checked }))}
                  />
                  symbols
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSecret}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
                >
                  Generate secret
                </button>
              </div>
              {secretWarning ? (
                <p className="mt-1 text-xs font-medium text-amber-600" role="alert">
                  {secretWarning}
                </p>
              ) : null}
            </label>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-900">
                  Active key
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={activeKeyId}
                    onChange={(event) => setActiveKeyId(event.target.value)}
                  >
                    <option value="">Select a key</option>
                    {keysForAlgorithm.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.kid} {entry.privateKey ? "(signing)" : "(public only)"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
                >
                  Generate {algorithm} key
                </button>
              </div>
              {activeKey && !activeKey.privateKey ? (
                <p className="text-xs font-medium text-amber-600">
                  Selected key is public-only. Import or generate a private key to sign.
                </p>
              ) : null}
              <div>
                <label className="block text-xs font-semibold text-slate-700">JWKS import / export</label>
                <p className="mt-1 text-[11px] text-slate-500">Supports RSA, P-256/P-384/P-521 ECDSA, and Ed25519 JWKS keys.</p>
                <textarea
                  className="mt-2 h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={jwksText}
                  onChange={(event) => setJwksText(event.target.value)}
                  placeholder='Paste JWKS JSON here ({"keys":[...]})'
                />
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleImportJwks}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Import JWKS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportJwks(false)}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Export public JWKS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportJwks(true)}
                    className="rounded-full bg-white px-3 py-1 font-semibold text-amber-700 shadow-[var(--shadow-soft)] ring-1 ring-amber-200 transition hover:-translate-y-0.5"
                  >
                    Export private JWKS
                  </button>
                </div>
                {jwksError ? <p className="mt-2 text-xs font-medium text-amber-600">{jwksError}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">PEM import / export</label>
                <p className="mt-1 text-[11px] text-slate-500">Paste PKCS8 private keys or SPKI public keys.</p>
                <textarea
                  className="mt-2 h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={pemText}
                  onChange={(event) => setPemText(event.target.value)}
                  placeholder="-----BEGIN PUBLIC KEY-----"
                />
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleImportPem("public")}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Import public PEM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportPem("private")}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Import private PEM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPem("public")}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Export active public PEM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPem("private")}
                    className="rounded-full bg-white px-3 py-1 font-semibold text-amber-700 shadow-[var(--shadow-soft)] ring-1 ring-amber-200 transition hover:-translate-y-0.5"
                  >
                    Export active private PEM
                  </button>
                </div>
                {pemError ? <p className="mt-2 text-xs font-medium text-amber-600">{pemError}</p> : null}
              </div>
              {keysForAlgorithm.length ? (
                <div className="space-y-2 text-xs text-slate-700">
                  {keysForAlgorithm.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                      <span>
                        <span className="font-semibold text-slate-900">{entry.kid}</span> · {entry.kty} ·{" "}
                        {entry.privateKey ? "signing + verify" : "public only"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(entry.id)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No keys loaded yet. Generate or import a JWKS.</p>
              )}
            </div>
          )}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Claims builder</p>
              <p className="text-xs text-slate-500">Standard claims</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                sub
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimSub}
                  onChange={(e) => setClaimSub(e.target.value)}
                  placeholder="Subject"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                iss
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimIss}
                  onChange={(e) => setClaimIss(e.target.value)}
                  placeholder="Issuer"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                aud
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimAud}
                  onChange={(e) => setClaimAud(e.target.value)}
                  placeholder="Audience"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                jti
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimJti}
                  onChange={(e) => setClaimJti(e.target.value)}
                  placeholder="JWT ID"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-700">
                iat
                <input
                  type="number"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimIat}
                  onChange={(e) => setClaimIat(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Epoch seconds"
                />
                {claimIat !== "" ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDateTime(Number(claimIat))} · {formatCountdown(Number(claimIat), nowSeconds)}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleSetIatNow}
                  className="mt-2 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Set to now
                </button>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                nbf
                <input
                  type="number"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimNbf}
                  onChange={(e) => setClaimNbf(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Epoch seconds"
                />
                {claimNbf !== "" ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDateTime(Number(claimNbf))} · {formatCountdown(Number(claimNbf), nowSeconds)}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetNbfOffset(0)}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetNbfOffset(300)}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    +5m
                  </button>
                </div>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                exp
                <input
                  type="number"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={claimExp}
                  onChange={(e) => setClaimExp(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Epoch seconds"
                />
                {claimExp !== "" ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDateTime(Number(claimExp))} · {formatCountdown(Number(claimExp), nowSeconds)}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetExpOffset(900)}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetExpOffset(3600)}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetExpOffset(604800)}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    7d
                  </button>
                </div>
              </label>
            </div>
            {claimWarnings.length ? (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                {claimWarnings.join(" ")}
              </div>
            ) : null}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Presets</p>
              <span className="text-[11px] text-slate-500">Stored locally</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
              >
                Save preset
              </button>
            </div>
            {presetError ? <p className="text-xs font-medium text-amber-600">{presetError}</p> : null}
            <p className="text-[11px] text-slate-500">Asymmetric keys are not stored; re-import keys after loading.</p>
            {presets.length ? (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">{preset.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(preset.id)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No presets saved yet.</p>
            )}
          </div>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Note: Signing runs locally. Do not use production secrets or keys here.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800" role="region" aria-label="Signed JWT output">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold">Signed JWT</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!token}
              >
                {copyStatus.token ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copyStatus.token ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[120px] overflow-auto p-4 text-xs leading-relaxed text-slate-100">
              {token || "Generate a token to see it here."}
            </pre>
            {token ? (
              <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-300">
                Length: {token.length} chars
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Token inspector">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Token inspector</p>
              {decoded?.header?.json && decoded.header.json.alg === "none" ? (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">alg=none warning</span>
              ) : null}
            </div>
            {decoded?.header?.json && decoded.header.json.alg && decoded.header.json.alg !== algorithm ? (
              <p className="mt-2 text-xs font-medium text-amber-600">
                Header alg is {String(decoded.header.json.alg)} but the signer is set to {algorithm}.
              </p>
            ) : null}
            {decoded?.payload?.json &&
            typeof decoded.payload.json.exp === "number" &&
            decoded.payload.json.exp < nowSeconds ? (
              <p className="mt-2 text-xs font-medium text-amber-600">Token is expired (exp is in the past).</p>
            ) : null}
            {token ? (
              <div className="mt-3 space-y-2 text-xs text-slate-700">
                <div className="rounded-lg bg-sky-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sky-700">Header</span>
                    <button
                      type="button"
                        onClick={() => {
                          if (!tokenSegments.header) return;
                          navigator.clipboard.writeText(tokenSegments.header);
                          triggerCopyStatus("headerSegment");
                          showToast("Copied header segment", "success");
                        }}
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 break-all text-[11px] text-slate-700">{tokenSegments.header}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-700">Payload</span>
                    <button
                      type="button"
                        onClick={() => {
                          if (!tokenSegments.payload) return;
                          navigator.clipboard.writeText(tokenSegments.payload);
                          triggerCopyStatus("payloadSegment");
                          showToast("Copied payload segment", "success");
                        }}
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 break-all text-[11px] text-slate-700">{tokenSegments.payload}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-700">Signature</span>
                    <button
                      type="button"
                        onClick={() => {
                          if (!tokenSegments.signature) return;
                          navigator.clipboard.writeText(tokenSegments.signature);
                          triggerCopyStatus("signatureSegment");
                          showToast("Copied signature segment", "success");
                        }}
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 break-all text-[11px] text-slate-700">{tokenSegments.signature}</p>
                </div>
                {tokenStats ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Total bytes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{tokenStats.tokenBytes}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Header/Payload bytes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {tokenStats.headerBytes} / {tokenStats.payloadBytes}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Signature bytes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{tokenStats.signatureBytes}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Generate a token to inspect its segments.</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Share and export">
            <p className="text-sm font-semibold text-slate-900">Share / export</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopyEnvSnippet}
                disabled={!token}
                className="rounded-full bg-white px-3 py-2 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Copy .env snippet
              </button>
              <button
                type="button"
                onClick={handleCopyAuthHeader}
                disabled={!token}
                className="rounded-full bg-white px-3 py-2 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Copy Authorization header
              </button>
            </div>
            {token ? (
              <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                JWT_TOKEN="{token}"
              </pre>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Verify JWT">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Verify token</p>
              {verifyResult ? (
                <span
                  className={
                    verifyResult === "valid"
                      ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                      : "rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                  }
                >
                  {verifyResult === "valid" ? "Signature valid" : "Signature invalid"}
                </span>
              ) : null}
            </div>
            <textarea
              className="mt-3 h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Paste JWT to verify"
              value={verifyTokenText}
              onChange={(event) => setVerifyTokenText(event.target.value)}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                Algorithm
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={verifyAlgorithm}
                  onChange={(event) => setVerifyAlgorithm(event.target.value as JwtAlg)}
                >
                  <option value="HS256">HS256</option>
                  <option value="HS384">HS384</option>
                  <option value="HS512">HS512</option>
                  <option value="RS256">RS256</option>
                  <option value="RS384">RS384</option>
                  <option value="RS512">RS512</option>
                  <option value="ES256">ES256</option>
                  <option value="ES384">ES384</option>
                  <option value="ES512">ES512</option>
                  <option value="EdDSA">EdDSA</option>
                </select>
              </label>
              {verifyAlgorithm === "HS256" || verifyAlgorithm === "HS384" || verifyAlgorithm === "HS512" ? (
                <label className="text-xs font-semibold text-slate-700">
                  Secret
                  <input
                    type="password"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={verifySecret}
                    onChange={(event) => setVerifySecret(event.target.value)}
                    placeholder="HMAC secret"
                    autoComplete="new-password"
                  />
                </label>
              ) : (
                <label className="text-xs font-semibold text-slate-700">
                  Key source
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={verifyKeySource}
                    onChange={(event) => setVerifyKeySource(event.target.value as "active" | "jwks")}
                  >
                    <option value="active">Active key</option>
                    <option value="jwks">JWKS</option>
                  </select>
                </label>
              )}
            </div>
            {verifyDecoded?.header?.json && verifyDecoded.header.json.alg && verifyDecoded.header.json.alg !== verifyAlgorithm ? (
              <p className="mt-2 text-xs font-medium text-amber-600">
                Token header alg is {String(verifyDecoded.header.json.alg)} but verification is set to {verifyAlgorithm}.
              </p>
            ) : null}
            {verifyAlgorithm !== "HS256" && verifyAlgorithm !== "HS384" && verifyAlgorithm !== "HS512" ? (
              <>
                {verifyKeySource === "active" ? (
                  <p className="mt-2 text-xs text-slate-600">Uses the selected active key from the key manager.</p>
                ) : (
                  <div className="mt-2 space-y-2 text-xs text-slate-600">
                    <textarea
                      className="h-[90px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={jwksVerifyText}
                      onChange={(event) => setJwksVerifyText(event.target.value)}
                      placeholder='Paste JWKS for verify ({"keys":[...]})'
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadVerifyJwks}
                        className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                      >
                        Load JWKS
                      </button>
                      <label className="flex items-center gap-2">
                        kid
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          value={verifyKid}
                          onChange={(event) => {
                            const kid = event.target.value;
                            setVerifyKid(kid);
                            const selected = jwksVerifyKeys.find((entry) => entry.kid === kid);
                            if (selected) setVerifyAlgorithm(selected.alg);
                          }}
                        >
                          {jwksVerifyKeys.map((entry) => (
                            <option key={entry.id} value={entry.kid}>
                              {entry.kid} ({entry.alg})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : null}
            {verifyError ? <p className="mt-2 text-xs font-medium text-amber-600">{verifyError}</p> : null}
            <button
              type="button"
              onClick={handleVerify}
              className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Verify signature
            </button>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Payload diff">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payload Diff</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
              {payloadDiffInfo.added.length ? (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Added: {payloadDiffInfo.added.join(", ")}</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">No helper claims added</span>
              )}
              {payloadDiffInfo.overridden.length ? (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                  Overwrote: {payloadDiffInfo.overridden.join(", ")}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">User payload</p>
                <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-xs text-slate-700">
                  {userPayload
                    ? JSON.stringify(userPayload, null, 2)
                    : payloadParse.error || "Payload must be a JSON object."}
                </pre>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Final signed payload</p>
                <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-xs text-slate-700">
                  {finalPayloadPreview ? JSON.stringify(finalPayloadPreview, null, 2) : "Fix payload errors to see output."}
                </pre>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT header">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Header</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.header?.json
                  ? JSON.stringify(decoded.header.json, null, 2)
                  : decoded?.header?.raw || "N/A"}
              </pre>
              {decoded?.header?.error ? (
                <p className="mt-2 text-xs font-medium text-amber-600">{decoded.header.error}</p>
              ) : null}
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.header) return;
                    const value = decoded.header.json ? JSON.stringify(decoded.header.json, null, 2) : decoded.header.raw;
                    navigator.clipboard.writeText(value);
                    triggerCopyStatus("header");
                    showToast("Copied header", "success");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {copyStatus.header ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.header) return;
                    const value = decoded.header.json ? JSON.stringify(decoded.header.json, null, 2) : decoded.header.raw;
                    const mime = decoded.header.json ? "application/json" : "text/plain";
                    const filename = decoded.header.json ? "jwt-header.json" : "jwt-header.txt";
                    const blob = new Blob([value], { type: mime });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename;
                    link.click();
                    URL.revokeObjectURL(url);
                    showToast("Downloaded header", "success");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT payload">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payload</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.payload?.json
                  ? JSON.stringify(decoded.payload.json, null, 2)
                  : decoded?.payload?.raw || "N/A"}
              </pre>
              {decoded?.payload?.error ? (
                <p className="mt-2 text-xs font-medium text-amber-600">{decoded.payload.error}</p>
              ) : null}
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.payload) return;
                    const value = decoded.payload.json ? JSON.stringify(decoded.payload.json, null, 2) : decoded.payload.raw;
                    navigator.clipboard.writeText(value);
                    triggerCopyStatus("payload");
                    showToast("Copied payload", "success");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {copyStatus.payload ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.payload) return;
                    const value = decoded.payload.json ? JSON.stringify(decoded.payload.json, null, 2) : decoded.payload.raw;
                    const mime = decoded.payload.json ? "application/json" : "text/plain";
                    const filename = decoded.payload.json ? "jwt-payload.json" : "jwt-payload.txt";
                    const blob = new Blob([value], { type: mime });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename;
                    link.click();
                    URL.revokeObjectURL(url);
                    showToast("Downloaded payload", "success");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
          </div>
            <p className="text-xs text-slate-600">
              Supports HS256/384/512, RS256/384/512, ES256/384/512, and EdDSA. Runs locally; do not use production secrets
              or keys here.
            </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste or edit your payload JSON.</li>
          <li>Select an algorithm, then provide a secret or signing key and fill standard claims in the builder.</li>
          <li>Generate the JWT, then copy or download the token or decoded parts.</li>
          <li>Use Verify to check a token signature with a secret or public key.</li>
          <li>Inspect segments or export snippets for headers and environments.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Signing happens in your browser; nothing is uploaded.</p>
          <p><strong>Algorithm?</strong> HS/RS/ES (256/384/512) and EdDSA. For production use strong keys and proper verification.</p>
          <p><strong>Secrets?</strong> Use non-production secrets here; this is for local/debugging use.</p>
        </div>
      </div>
    </main>
  );
}
