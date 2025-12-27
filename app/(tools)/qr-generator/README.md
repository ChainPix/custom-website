# QR Code Generator Tool Documentation

- Version: 2.0.0
- Category: Productivity Tools
- Last Updated: 2025-12-27
- Status: Stable

---

## Overview

Client-side QR code generator with structured payload builders, styling controls, export options, and a built-in scan verification mode. All generation happens locally in the browser with no uploads.

### Primary Use Cases
- Create QR codes for links, Wi-Fi, vCards, email, SMS, geo, and calendar events
- Export print-ready PNG or SVG with transparent backgrounds
- Verify scannability before printing or sharing
- Share reusable QR configurations via URL hash

---

## Key Features

### Core Generation
- Live (debounced) or Manual generation modes
- Web Worker preview generation to keep the UI responsive
- Async race protection to avoid stale previews
- Preview size mirrors the selected output size

### Payload Builders
- Wi-Fi (SSID, password, security, hidden)
- vCard (name, org, phone, email)
- Email and SMS
- Geo location
- Calendar events (VEVENT)
- UTM/deep link builder for marketing links

### Export and Sharing
- Download as PNG or SVG
- Transparent background export
- Copy QR image to clipboard (ClipboardItem)
- Custom filename with smart suggestions
- Shareable links that encode payload + settings in the URL hash

### Scannability and Styling
- Quiet zone (margin) control
- Error correction levels (L/M/Q/H)
- Mask pattern selection
- Rounded modules
- Logo overlay with safety guardrails
- Scan difficulty meter (Easy/Medium/Hard) with tooltip

### QA Mode
- In-browser camera scan verification
- Guided checklist: generate -> scan -> confirm

---

## Payload Formats (Examples)

### Wi-Fi
```
WIFI:T:WPA;S:MyNetwork;P:secret;H:false;;
```

### vCard
```
BEGIN:VCARD
VERSION:3.0
FN:Ada Lovelace
ORG:ToolStack
TEL:+15551234567
EMAIL:ada@example.com
END:VCARD
```

### Email / SMS
```
mailto:hello@example.com?subject=Hello&body=Hi
sms:+15551234567?body=Hello
```

### Geo
```
geo:37.7749,-122.4194
```

### Calendar Event (VEVENT)
```
BEGIN:VEVENT
SUMMARY:Launch
DTSTART:20251227T090000Z
DTEND:20251227T100000Z
LOCATION:Online
DESCRIPTION:Kickoff call
END:VEVENT
```

---

## How to Use

1. Choose Text mode or a Builder (Wi-Fi, vCard, Email, SMS, Geo, Event, UTM).
2. Enter details, then select Live or Manual generation.
3. Adjust size, colors, quiet zone, and error correction.
4. Export PNG/SVG, copy the QR image, or verify with Scan Test.

---

## Scan Difficulty Meter

The difficulty meter estimates scan density from payload length and error correction level. Longer payloads and higher error correction increase density, which can make scans harder on small prints or low-contrast surfaces.

---

## Privacy and Data Handling

- All QR generation runs locally in the browser.
- Recents are stored in localStorage on the device.
- Share links encode payload + settings in the URL hash only.
- Camera access is requested only in Scan Test mode.

---

## Limits and Guardrails

- Very large payloads show a warning and may scan unreliably.
- URL validation is optional and applies to Text mode only.
- Logo overlay enforces error correction level H and limits logo size to a safe range.
- Transparent exports use alpha backgrounds for PNG/SVG.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Canvas API (PNG export)
- Clipboard API with ClipboardItem (copy image)
- BarcodeDetector and camera access (Scan Test)

If BarcodeDetector is unavailable, Scan Test is disabled gracefully.

---

## File Structure

```
app/(tools)/qr-generator/
- client.tsx
- page.tsx
- use-qr-generator.ts
- payload-builders.ts
- qr-worker.ts
- utils.ts
- README.md
```

---

## Dependencies

- qrcode (generation)
- lucide-react (icons)

---

## SEO and Structured Data

- Expanded metadata (title, description, keywords, canonical)
- JSON-LD: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage

---

## Testing

- Unit tests: payload builders and formatting
  - tests/qr-payload-builders.unit.spec.ts
- Playwright smoke tests:
  - tests/qr-generator.spec.ts

---

## Troubleshooting

**QR preview is blank**
- Ensure a payload is present and valid.
- If URL validation is enabled, confirm the URL is absolute.

**Copy image fails**
- ClipboardItem requires HTTPS and supported browsers.

**Scan test unavailable**
- BarcodeDetector or camera permissions are required.

---

## Notes

- Live mode is debounced to avoid generating on every keystroke.
- Manual mode is recommended for very large payloads or mobile devices.
- Share links are client-side only and do not hit a server.
