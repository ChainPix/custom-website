# WebP Converter — Manual Test Checklist

- **Happy path**: Upload a small JPG/PNG → converts to WebP; status shows success; preview displays.
- **Quality slider**: Change quality (e.g., 50% vs 90%) and reconvert; output size pill updates.
- **Guardrails**: Upload non-image → shows type error; upload >10MB → size error; blank drop does nothing.
- **Copy/Download**: Copy data URL to clipboard; download produces a `.webp` file that opens.
- **Unsupported browser**: Force a failure (e.g., simulate missing WebP) should show an inline error.
- **Accessibility**: `aria-live` status updates; upload is keyboard-activatable; regions labeled; focus rings visible.
