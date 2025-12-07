# HTML Entities – Manual Test Checklist

## Setup
- Open `/html-entities` in the browser.
- Ensure status region announces updates (aria-live) and output region is labeled.

## Scenarios
1) **Encode HTML snippet**
   - Input: `<div class="card">Tom & Jerry's "best" episode</div>`
   - Mode: Encode → Expect entities for `<`, `>`, `&`, quotes.
   - Copy output → status shows “Copied”.
   - Download output → file is non-empty.

2) **Decode entity string**
   - Input: `&lt;div&gt;A &amp; B&#39;s &quot;test&quot;&lt;/div&gt;`
   - Mode: Decode → Expect readable text restored.

3) **Empty input warning**
   - Clear input and click Encode/Decode → see inline warning/status “No input”.

4) **Large input warning**
   - Paste a string >50k chars (e.g., repeat “abc”); see large input warning; processing still completes.

5) **Auto-run toggle**
   - Enable Auto-run, change text → output updates automatically.
   - Disable Auto-run, change text → no auto change; click Encode/Decode to update.

6) **Trim toggle**
   - Add leading/trailing whitespace; with Trim on, output ignores it; with Trim off, preserves it.

7) **Accessibility**
   - Screen reader announces status changes (encode/decode/copy/download/clear errors).
   - Output region has a label (`role="region"` with heading).

8) **Error handling**
   - Input malformed entity string; Decode shows friendly error without crashing.
