"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

const LARGE_CHARS = 2000;
const DEBOUNCE_MS = 220;

const getScanDifficulty = (length: number, level: "L" | "M" | "Q" | "H") => {
  if (!length) return { label: "--", tone: "text-slate-500", badge: "bg-slate-100 text-slate-600" };
  const multiplier = { L: 1, M: 1.15, Q: 1.35, H: 1.6 }[level];
  const score = length * multiplier;
  if (score <= 300) return { label: "Easy", tone: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700" };
  if (score <= 900) return { label: "Medium", tone: "text-amber-600", badge: "bg-amber-50 text-amber-700" };
  return { label: "Hard", tone: "text-rose-600", badge: "bg-rose-50 text-rose-700" };
};

const sanitizeFilenameBase = (value: string) => {
  const trimmed = value.trim().replace(/\.(png|svg)$/i, "");
  const cleaned = trimmed.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "qr-code";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const getSuggestedFilenameBase = (payload: string) => {
  if (!payload) return "qr-code";
  if (payload.startsWith("WIFI:")) {
    const match = payload.match(/S:([^;]+);/);
    const ssid = match?.[1] ? slugify(match[1]) : "";
    return ssid ? `wifi-${ssid}` : "wifi-qr";
  }
  try {
    const url = new URL(payload);
    const host = slugify(url.hostname.replace(/^www\./, ""));
    return host ? `link-${host}` : "link-qr";
  } catch {
    return "text-qr";
  }
};

const buildSvgDataUrl = (svgMarkup: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

const svgToPngBlob = (svgMarkup: string, size: number) =>
  new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("PNG export failed"));
          return;
        }
        resolve(blob);
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Image render failed"));
    img.src = buildSvgDataUrl(svgMarkup);
  });

type BuilderType = "wifi" | "vcard" | "email" | "sms" | "geo" | "event" | "utm";

const escapeWifiValue = (value: string) => value.replace(/[\\;,:]/g, "\\$&");

const escapeVCardValue = (value: string) =>
  value.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

const formatDateUtc = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

const buildUtmUrl = (baseUrl: string, params: Record<string, string>) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, val]) => {
    if (val) url.searchParams.set(key, val);
  });
  return url.toString();
};

export default function QrGeneratorClient() {
  const [text, setText] = useState("");
  const [manualText, setManualText] = useState("");
  const [payloadMode, setPayloadMode] = useState<"text" | "builder">("text");
  const [builderType, setBuilderType] = useState<BuilderType>("wifi");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [vcardName, setVcardName] = useState("");
  const [vcardOrg, setVcardOrg] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [utmUrl, setUtmUrl] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmDeepLink, setUtmDeepLink] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [size, setSize] = useState(224);
  const [correction, setCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [validateUrl, setValidateUrl] = useState(false);
  const [trim, setTrim] = useState(true);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [generationMode, setGenerationMode] = useState<"live" | "manual">("live");
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportTransparent, setExportTransparent] = useState(false);
  const [filenameBase, setFilenameBase] = useState("qr-code");
  const [isExporting, setIsExporting] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const lastPreviewPayloadRef = useRef("");
  const lastPreviewRequestRef = useRef(0);
  const [workerFailed, setWorkerFailed] = useState(false);
  const filenameDirtyRef = useRef(false);
  const payload = payloadMode === "builder" ? text : trim ? text.trim() : text;
  const hasPayload = payload.length > 0;
  const difficulty = getScanDifficulty(payload.length, correction);
  const suggestedFilenameBase = getSuggestedFilenameBase(payload);
  const builderOutput = useMemo(() => {
    let payloadValue = "";
    let errorMessage = "";

    if (builderType === "wifi") {
      const ssid = wifiSsid.trim();
      const password = wifiPassword.trim();
      if (!ssid) {
        errorMessage = "SSID is required.";
      } else if (wifiSecurity !== "nopass" && !password) {
        errorMessage = "Password is required for secured Wi-Fi.";
      } else {
        const type = wifiSecurity === "nopass" ? "nopass" : wifiSecurity;
        const parts = [`T:${type}`, `S:${escapeWifiValue(ssid)}`];
        if (wifiSecurity !== "nopass") {
          parts.push(`P:${escapeWifiValue(password)}`);
        }
        if (wifiHidden) {
          parts.push("H:true");
        }
        payloadValue = `WIFI:${parts.join(";")};;`;
      }
    }

    if (builderType === "vcard") {
      const name = vcardName.trim();
      const org = vcardOrg.trim();
      const phone = vcardPhone.trim();
      const email = vcardEmail.trim();
      if (!name && !org && !phone && !email) {
        errorMessage = "Add at least a name, org, phone, or email.";
      } else {
        const lines = ["BEGIN:VCARD", "VERSION:3.0"];
        if (name) lines.push(`FN:${escapeVCardValue(name)}`);
        if (org) lines.push(`ORG:${escapeVCardValue(org)}`);
        if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(phone)}`);
        if (email) lines.push(`EMAIL:${escapeVCardValue(email)}`);
        lines.push("END:VCARD");
        payloadValue = lines.join("\n");
      }
    }

    if (builderType === "email") {
      const to = emailTo.trim();
      if (!to) {
        errorMessage = "Email address is required.";
      } else {
        const params = new URLSearchParams();
        if (emailSubject.trim()) params.set("subject", emailSubject.trim());
        if (emailBody.trim()) params.set("body", emailBody.trim());
        const query = params.toString();
        payloadValue = query ? `mailto:${to}?${query}` : `mailto:${to}`;
      }
    }

    if (builderType === "sms") {
      const to = smsTo.trim();
      if (!to) {
        errorMessage = "Phone number is required.";
      } else {
        const body = smsBody.trim();
        payloadValue = body ? `sms:${to}?body=${encodeURIComponent(body)}` : `sms:${to}`;
      }
    }

    if (builderType === "geo") {
      const lat = Number.parseFloat(geoLat);
      const lng = Number.parseFloat(geoLng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        errorMessage = "Latitude and longitude are required.";
      } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errorMessage = "Latitude or longitude is out of range.";
      } else {
        payloadValue = `geo:${lat},${lng}`;
      }
    }

    if (builderType === "event") {
      const summary = eventTitle.trim();
      const start = formatDateUtc(eventStart);
      const end = formatDateUtc(eventEnd);
      if (!summary) {
        errorMessage = "Event title is required.";
      } else if (!start) {
        errorMessage = "Start date/time is required.";
      } else if (end && start && end < start) {
        errorMessage = "End time must be after start time.";
      } else {
        const lines = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//ToolStack//QR Generator//EN",
          "BEGIN:VEVENT",
          `SUMMARY:${escapeVCardValue(summary)}`,
          `DTSTART:${start}`,
        ];
        if (end) lines.push(`DTEND:${end}`);
        if (eventLocation.trim()) lines.push(`LOCATION:${escapeVCardValue(eventLocation.trim())}`);
        if (eventDescription.trim()) lines.push(`DESCRIPTION:${escapeVCardValue(eventDescription.trim())}`);
        lines.push("END:VEVENT", "END:VCALENDAR");
        payloadValue = lines.join("\n");
      }
    }

    if (builderType === "utm") {
      const deepLink = utmDeepLink.trim();
      if (deepLink) {
        payloadValue = deepLink;
      } else if (!utmUrl.trim()) {
        errorMessage = "Destination URL is required.";
      } else {
        try {
          payloadValue = buildUtmUrl(utmUrl.trim(), {
            utm_source: utmSource.trim(),
            utm_medium: utmMedium.trim(),
            utm_campaign: utmCampaign.trim(),
            utm_term: utmTerm.trim(),
            utm_content: utmContent.trim(),
          });
        } catch {
          errorMessage = "Enter a valid URL (include https://).";
        }
      }
    }

    return { payload: payloadValue, error: errorMessage };
  }, [
    builderType,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    wifiHidden,
    vcardName,
    vcardOrg,
    vcardPhone,
    vcardEmail,
    emailTo,
    emailSubject,
    emailBody,
    smsTo,
    smsBody,
    geoLat,
    geoLng,
    eventTitle,
    eventLocation,
    eventDescription,
    eventStart,
    eventEnd,
    utmUrl,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    utmDeepLink,
  ]);
  const builderPayload = builderOutput.payload;
  const builderError = builderOutput.error;
  const canUsePayload = hasPayload && !(payloadMode === "builder" && builderError);

  const getPreviewOptions = useCallback(
    () => ({
      margin: 1,
      width: size,
      errorCorrectionLevel: correction,
      color: { dark: fgColor, light: bgColor },
    }),
    [size, correction, fgColor, bgColor]
  );

  const generatePreviewFallback = useCallback(
    async (value: string, requestId: number) => {
      try {
        const QRCode = await import("qrcode");
        const svgMarkup = await QRCode.toString(value, { ...getPreviewOptions(), type: "svg" });
        if (requestId !== requestIdRef.current) return;
        setDataUrl(buildSvgDataUrl(svgMarkup));
        setError("");
        setStatus("QR generated");
      } catch (err) {
        console.error("QR fallback preview failed", err);
        if (requestId !== requestIdRef.current) return;
        setDataUrl("");
        setError("Unable to generate QR code for this input.");
        setStatus("Error");
      } finally {
        if (requestId === requestIdRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [getPreviewOptions]
  );

  useEffect(() => {
    const worker = new Worker(new URL("./qr-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { requestId, data, error: workerError } = event.data as {
        requestId: number;
        data?: string;
        error?: string;
      };
      if (requestId !== requestIdRef.current) return;
      setIsGenerating(false);
      if (workerError) {
        setWorkerFailed(true);
        void generatePreviewFallback(lastPreviewPayloadRef.current, requestId);
        return;
      }
      setDataUrl(data ? buildSvgDataUrl(data) : "");
      setError("");
      setStatus("QR generated");
    };

    worker.onerror = (err) => {
      if (!workerFailed) {
        console.warn("QR worker error, falling back to main thread preview.", err);
      }
      setWorkerFailed(true);
      void generatePreviewFallback(lastPreviewPayloadRef.current, requestIdRef.current);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [generatePreviewFallback]);

  const getExportOptions = useCallback(
    (transparent: boolean) => ({
      margin: 1,
      width: size,
      errorCorrectionLevel: correction,
      color: { dark: fgColor, light: transparent ? "#00000000" : bgColor },
    }),
    [size, correction, fgColor, bgColor]
  );

  const generateQr = useCallback(
    (value?: string) => {
      const payload = payloadMode === "builder" ? value ?? text : trim ? (value ?? text).trim() : value ?? text;
      if (!payload) {
        setDataUrl("");
        setError("");
        setStatus("Awaiting input");
        setIsGenerating(false);
        return;
      }
      if (payloadMode === "builder" && builderError) {
        setError(builderError);
        setStatus("Invalid payload");
        setIsGenerating(false);
        return;
      }
      if (payloadMode === "text" && validateUrl) {
        try {
          // eslint-disable-next-line no-new
          new URL(payload);
          setError("");
        } catch {
          setError("This doesn't look like a valid URL.");
          setDataUrl("");
          setStatus("Invalid URL");
          setIsGenerating(false);
          return;
        }
      }
      const worker = workerRef.current;
      if (!worker || workerFailed) {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        lastPreviewRequestRef.current = requestId;
        lastPreviewPayloadRef.current = payload;
        setIsGenerating(true);
        setStatus("Generating...");
        void generatePreviewFallback(payload, requestId);
        return;
      }
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      lastPreviewRequestRef.current = requestId;
      lastPreviewPayloadRef.current = payload;
      setIsGenerating(true);
      setStatus("Generating...");
      worker.postMessage({
        requestId,
        purpose: "preview",
        format: "svg",
        payload,
        options: getPreviewOptions(),
      });
    },
    [text, trim, validateUrl, payloadMode, builderError, getPreviewOptions]
  );

  useEffect(() => {
    if (!payload) {
      setWarning("");
      return;
    }
    if (payload.length > LARGE_CHARS) {
      setWarning(`Large input (${payload.length.toLocaleString()} chars). Try shorter text for reliable scans.`);
    } else {
      setWarning("");
    }
  }, [payload]);

  useEffect(() => {
    if (payloadMode === "builder") {
      setText(builderPayload);
    } else {
      setText(manualText);
    }
  }, [payloadMode, builderPayload, manualText]);

  useEffect(() => {
    if (generationMode !== "live") return;
    if (!payload) {
      setDataUrl("");
      setError("");
      setStatus("Awaiting input");
      setIsGenerating(false);
      return;
    }
    const timeout = window.setTimeout(() => generateQr(payload), DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [payload, size, correction, fgColor, bgColor, validateUrl, generationMode, generateQr]);

  const markManualDirty = useCallback(() => {
    if (generationMode !== "manual") return;
    if (!payload) {
      setStatus("Awaiting input");
      return;
    }
    setStatus("Ready to generate");
  }, [generationMode, payload]);

  const handleChange = (value: string) => {
    if (payloadMode !== "text") return;
    const nextPayload = trim ? value.trim() : value;
    setManualText(value);
    setText(value);
    setError("");
    if (!nextPayload) {
      setDataUrl("");
      setWarning("");
      setStatus("Awaiting input");
      setIsGenerating(false);
      return;
    }
    if (generationMode === "manual") {
      setStatus("Ready to generate");
    }
  };

  useEffect(() => {
    if (generationMode === "manual") {
      markManualDirty();
    }
  }, [generationMode, markManualDirty]);

  const resetBuilderFields = useCallback(() => {
    setWifiSsid("");
    setWifiPassword("");
    setWifiSecurity("WPA");
    setWifiHidden(false);
    setVcardName("");
    setVcardOrg("");
    setVcardPhone("");
    setVcardEmail("");
    setEmailTo("");
    setEmailSubject("");
    setEmailBody("");
    setSmsTo("");
    setSmsBody("");
    setGeoLat("");
    setGeoLng("");
    setEventTitle("");
    setEventLocation("");
    setEventDescription("");
    setEventStart("");
    setEventEnd("");
    setUtmUrl("");
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
    setUtmTerm("");
    setUtmContent("");
    setUtmDeepLink("");
  }, []);

  const handleClear = () => {
    if (payloadMode === "builder") {
      resetBuilderFields();
      setText("");
      setWarning("");
      setError("");
      setStatus("Awaiting input");
      setIsGenerating(false);
      return;
    }
    handleChange("");
  };

  useEffect(() => {
    if (!payload) {
      filenameDirtyRef.current = false;
    }
    if (!filenameDirtyRef.current) {
      setFilenameBase(suggestedFilenameBase);
    }
  }, [payload, suggestedFilenameBase]);

  const buildExportFilename = useCallback(
    (extension: "png" | "svg") => {
      const base = sanitizeFilenameBase(filenameBase || suggestedFilenameBase);
      return `${base}.${extension}`;
    },
    [filenameBase, suggestedFilenameBase]
  );

  const requestExport = useCallback(async () => {
    const currentPayload = payloadMode === "builder" ? text : trim ? text.trim() : text;
    if (!currentPayload) {
      setStatus("Awaiting input");
      return "";
    }
    if (payloadMode === "builder" && builderError) {
      setError(builderError);
      setStatus("Invalid payload");
      return "";
    }
    if (payloadMode === "text" && validateUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(currentPayload);
      } catch {
        setError("This doesn't look like a valid URL.");
        setStatus("Invalid URL");
        return "";
      }
    }
    setError("");
    try {
      const QRCode = await import("qrcode");
      return await QRCode.toString(currentPayload, { ...getExportOptions(exportTransparent), type: "svg" });
    } catch (err) {
      console.error("SVG export failed", err);
      setStatus("Export failed");
      return "";
    }
  }, [text, trim, validateUrl, exportTransparent, getExportOptions, payloadMode, builderError]);

  const handleCopy = async () => {
    try {
      const copyValue = payloadMode === "builder" ? builderPayload : text;
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied text");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownloadPng = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setStatus("Preparing PNG...");
    try {
      const svgMarkup = await requestExport();
      if (!svgMarkup) return;
      const blob = await svgToPngBlob(svgMarkup, size);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFilename("png");
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Downloaded PNG");
    } catch (err) {
      console.error("PNG export failed", err);
      setStatus("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setStatus("Preparing SVG...");
    try {
      const svgMarkup = await requestExport();
      if (!svgMarkup) return;
      const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFilename("svg");
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Downloaded SVG");
    } catch (err) {
      console.error("SVG export failed", err);
      setStatus("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (isExporting) return;
    if (!navigator.clipboard?.write) {
      setStatus("Clipboard unavailable");
      return;
    }
    setIsExporting(true);
    setStatus("Copying image...");
    try {
      const svgMarkup = await requestExport();
      if (!svgMarkup) return;
      const blob = await svgToPngBlob(svgMarkup, size);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setStatus("QR image copied");
    } catch (err) {
      console.error("Copy image failed", err);
      setStatus("Copy failed");
    } finally {
      setIsExporting(false);
    }
  };

  const loadSample = (type: "url" | "text" | "wifi") => {
    const samples: Record<typeof type, string> = {
      url: "https://toolstack-nu.vercel.app/",
      text: "Quick share text via QR",
      wifi: "WIFI:T:WPA;S:ToolStackWiFi;P:SuperSecret123;;",
    };
    const val = samples[type];
    setPayloadMode("text");
    setManualText(val);
    setText(val);
    setStatus(`Sample loaded: ${type}`);
    if (generationMode === "manual") {
      setStatus("Ready to generate");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {warning}
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
              QR Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">QR Code Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create QR codes from text or URLs and download them instantly. Generation runs locally in
          your browser.
        </p>
        <p className="text-sm text-slate-600">Private and client-side: QR codes are generated locally and not uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadSample("url")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample URL"
          >
            <Sparkles className="h-4 w-4" />
            Sample URL
          </button>
          <button
            onClick={() => loadSample("text")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample text"
          >
            <Sparkles className="h-4 w-4" />
            Sample Text
          </button>
          <button
            onClick={() => loadSample("wifi")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample Wi-Fi string"
          >
            <Sparkles className="h-4 w-4" />
            Sample Wi-Fi
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear input"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!payload}
            aria-label="Copy input text"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied text" : "Copy text"}
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Payload mode</span>
            <button
              type="button"
              onClick={() => setPayloadMode("text")}
              aria-pressed={payloadMode === "text"}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                payloadMode === "text"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5"
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setPayloadMode("builder")}
              aria-pressed={payloadMode === "builder"}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                payloadMode === "builder"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5"
              }`}
            >
              Builder
            </button>
          </div>
          {payloadMode === "builder" && (
            <div className="mt-4 space-y-4 text-xs text-slate-700">
              <label className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">Builder</span>
                <select
                  value={builderType}
                  onChange={(event) => setBuilderType(event.target.value as BuilderType)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="wifi">Wi-Fi</option>
                  <option value="vcard">vCard</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="geo">Geo location</option>
                  <option value="event">Calendar event</option>
                  <option value="utm">UTM / Deep link</option>
                </select>
              </label>

              {builderType === "wifi" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">SSID</span>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(event) => setWifiSsid(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="CoffeeShopWiFi"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Password</span>
                    <input
                      type="password"
                      value={wifiPassword}
                      onChange={(event) => setWifiPassword(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="password"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Security</span>
                    <select
                      value={wifiSecurity}
                      onChange={(event) => setWifiSecurity(event.target.value as "WPA" | "WEP" | "nopass")}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Open</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={wifiHidden}
                      onChange={(event) => setWifiHidden(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    />
                    Hidden network
                  </label>
                </div>
              )}

              {builderType === "vcard" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Name</span>
                    <input
                      type="text"
                      value={vcardName}
                      onChange={(event) => setVcardName(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Taylor Swift"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Organization</span>
                    <input
                      type="text"
                      value={vcardOrg}
                      onChange={(event) => setVcardOrg(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="ToolStack"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Phone</span>
                    <input
                      type="tel"
                      value={vcardPhone}
                      onChange={(event) => setVcardPhone(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="+1 555 222 0011"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Email</span>
                    <input
                      type="email"
                      value={vcardEmail}
                      onChange={(event) => setVcardEmail(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="hello@toolstack.dev"
                    />
                  </label>
                </div>
              )}

              {builderType === "email" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">To</span>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(event) => setEmailTo(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="hello@toolstack.dev"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Subject</span>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(event) => setEmailSubject(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Hello from ToolStack"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-semibold text-slate-900">Body</span>
                    <textarea
                      value={emailBody}
                      onChange={(event) => setEmailBody(event.target.value)}
                      className="h-20 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Write your email body"
                    />
                  </label>
                </div>
              )}

              {builderType === "sms" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Phone</span>
                    <input
                      type="tel"
                      value={smsTo}
                      onChange={(event) => setSmsTo(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="+1 555 222 0011"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-semibold text-slate-900">Message</span>
                    <textarea
                      value={smsBody}
                      onChange={(event) => setSmsBody(event.target.value)}
                      className="h-20 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Meet me at 7?"
                    />
                  </label>
                </div>
              )}

              {builderType === "geo" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Latitude</span>
                    <input
                      type="number"
                      value={geoLat}
                      onChange={(event) => setGeoLat(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="37.7749"
                      step="any"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Longitude</span>
                    <input
                      type="number"
                      value={geoLng}
                      onChange={(event) => setGeoLng(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="-122.4194"
                      step="any"
                    />
                  </label>
                </div>
              )}

              {builderType === "event" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-semibold text-slate-900">Title</span>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Launch Meeting"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Start</span>
                    <input
                      type="datetime-local"
                      value={eventStart}
                      onChange={(event) => setEventStart(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">End</span>
                    <input
                      type="datetime-local"
                      value={eventEnd}
                      onChange={(event) => setEventEnd(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">Location</span>
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={(event) => setEventLocation(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="HQ boardroom"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-semibold text-slate-900">Description</span>
                    <textarea
                      value={eventDescription}
                      onChange={(event) => setEventDescription(event.target.value)}
                      className="h-20 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Agenda or notes"
                    />
                  </label>
                </div>
              )}

              {builderType === "utm" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-semibold text-slate-900">Destination URL</span>
                    <input
                      type="url"
                      value={utmUrl}
                      onChange={(event) => setUtmUrl(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="https://toolstack.dev/landing"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">UTM Source</span>
                    <input
                      type="text"
                      value={utmSource}
                      onChange={(event) => setUtmSource(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="newsletter"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">UTM Medium</span>
                    <input
                      type="text"
                      value={utmMedium}
                      onChange={(event) => setUtmMedium(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="qr"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">UTM Campaign</span>
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={(event) => setUtmCampaign(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="launch-2025"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">UTM Term</span>
                    <input
                      type="text"
                      value={utmTerm}
                      onChange={(event) => setUtmTerm(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="winter promo"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">UTM Content</span>
                    <input
                      type="text"
                      value={utmContent}
                      onChange={(event) => setUtmContent(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="poster-a"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-semibold text-slate-900">App deep link (optional)</span>
                    <input
                      type="text"
                      value={utmDeepLink}
                      onChange={(event) => setUtmDeepLink(event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="myapp://promo"
                    />
                  </label>
                </div>
              )}

              <label className="flex flex-col gap-2">
                <span className="font-semibold text-slate-900">Generated payload</span>
                <textarea
                  value={builderPayload}
                  readOnly
                  className="h-24 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 shadow-inner focus:outline-none"
                  placeholder="Fill the builder to generate payload."
                />
              </label>
              {builderError ? (
                <p className="text-sm font-medium text-amber-600" role="alert">
                  {builderError}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <textarea
          className="h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={payloadMode === "builder" ? builderPayload : text}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={payloadMode === "builder" ? "Payload generated from the builder." : "Paste text or URL to generate a QR code"}
          readOnly={payloadMode === "builder"}
          aria-readonly={payloadMode === "builder"}
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Generate mode</span>
          <button
            type="button"
            onClick={() => setGenerationMode("live")}
            aria-pressed={generationMode === "live"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              generationMode === "live"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5"
            }`}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => setGenerationMode("manual")}
            aria-pressed={generationMode === "manual"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              generationMode === "manual"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5"
            }`}
          >
            Manual
          </button>
          {generationMode === "manual" && (
            <button
              type="button"
              onClick={() => generateQr()}
              disabled={!canUsePayload || isGenerating}
              className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Generate QR code"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use for share links, wifi creds, or short notes. All generation stays in your browser.
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Size</span>
            <input
              type="range"
              min={128}
              max={384}
              step={16}
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                markManualDirty();
              }}
              aria-label="QR size"
            />
            <span className="w-12 text-right text-xs text-slate-700">{size}px</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Error correction</span>
            <select
              value={correction}
              onChange={(e) => {
                setCorrection(e.target.value as "L" | "M" | "Q" | "H");
                markManualDirty();
              }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="L">L (low)</option>
              <option value="M">M (med)</option>
              <option value="Q">Q (quartile)</option>
              <option value="H">H (high)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={validateUrl}
              onChange={(e) => {
                setValidateUrl(e.target.checked);
                markManualDirty();
              }}
              disabled={payloadMode === "builder"}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Validate as URL
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => {
                setTrim(e.target.checked);
                markManualDirty();
              }}
              disabled={payloadMode === "builder"}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Trim input
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-900">Foreground</span>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => {
                setFgColor(e.target.value);
                markManualDirty();
              }}
              aria-label="Foreground color"
              className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-900">Background</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                markManualDirty();
              }}
              aria-label="Background color"
              className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={exportTransparent}
              onChange={(e) => setExportTransparent(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Transparent export
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-900">Filename</span>
            <input
              type="text"
              value={filenameBase}
              onChange={(event) => {
                filenameDirtyRef.current = true;
                setFilenameBase(event.target.value);
              }}
              onBlur={(event) => setFilenameBase(sanitizeFilenameBase(event.target.value))}
              placeholder={suggestedFilenameBase}
              className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Export filename"
            />
            <span className="text-[10px] text-slate-500">.png/.svg</span>
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-900">Scan difficulty</span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${difficulty.badge}`}
              title="Based on input length and error correction level."
            >
              {difficulty.label}
            </span>
          </div>
        </div>
        </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="text-sm font-semibold" id="qr-preview-label">QR Preview</div>
        <div
          className="flex items-center justify-center rounded-2xl bg-white"
          style={{ width: size, height: size }}
          role="region"
          aria-labelledby="qr-preview-label"
          tabIndex={0}
        >
          {dataUrl ? (
            <img src={dataUrl} alt="Generated QR code" className="h-full w-full" />
          ) : (
            <p className="text-slate-500">QR will appear here</p>
          )}
        </div>
        <div className={`text-xs font-semibold ${difficulty.tone}`}>
          Scan difficulty: {difficulty.label}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleDownloadPng}
            disabled={!canUsePayload || isExporting}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!canUsePayload || isExporting}
            aria-label="Download QR code as PNG"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
          <button
            onClick={handleDownloadSvg}
            disabled={!canUsePayload || isExporting}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!canUsePayload || isExporting}
            aria-label="Download QR code as SVG"
          >
            <Download className="h-4 w-4" />
            Download SVG
          </button>
          <button
            onClick={handleCopyImage}
            disabled={!canUsePayload || isExporting}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!canUsePayload || isExporting}
            aria-label="Copy QR image to clipboard"
          >
            <Clipboard className="h-4 w-4" />
            Copy Image
          </button>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste text/URL (or load a sample), adjust size and error correction, and pick colors.</li>
          <li>Enable URL validation when you only expect links; trim input if pasting with extra spaces.</li>
          <li>Copy your input or download the generated PNG once the preview appears.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this private?</summary>
            <p className="mt-2 text-slate-700">Yes. QR codes are generated locally in your browser; nothing is uploaded.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I validate URLs?</summary>
            <p className="mt-2 text-slate-700">Yes. Toggle “Validate as URL” to block malformed links.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I change colors and size?</summary>
            <p className="mt-2 text-slate-700">Yes. Adjust size slider and color pickers; choose error correction level for density.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
