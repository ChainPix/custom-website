"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Check, Clipboard, RefreshCcw, Upload } from "lucide-react";

export default function ImageBase64Client() {
  const [preview, setPreview] = useState<string>("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      setPreview("");
      setOutput("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setPreview(result);
        setOutput(result);
        setError("");
      } else {
        setError("Could not read this file.");
        setPreview("");
        setOutput("");
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setPreview("");
      setOutput("");
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Image to Base64</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert images to Base64 strings locally. Drag and drop an image to get copy-ready output.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <label
            htmlFor="img-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400"
          >
            <Upload className="h-5 w-5 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-900">Drop an image or click to upload</p>
              <p className="text-slate-600">PNG, JPG, GIF recommended under 5MB.</p>
            </div>
            <input
              id="img-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPreview("");
                setOutput("");
                setError("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Base64"}
            </button>
          </div>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: Great for embeds or data URIs.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            {preview ? (
              <Image src={preview} alt="Preview" width={240} height={240} className="max-h-60 w-auto" />
            ) : (
              <p className="text-sm text-slate-500">Preview will appear here.</p>
            )}
          </div>
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Base64 Output</div>
            <pre className="max-h-[220px] overflow-auto p-4 text-xs leading-relaxed text-slate-100">
              {output || "Encoded Base64 will appear here."}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
