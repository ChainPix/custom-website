# Email CSS Inliner — Manual Test Checklist

- **Basic inline (valid HTML/CSS)**: Paste the default sample and click “Inline CSS”; confirm output shows inline styles and status reads “Inlined successfully.”
- **Marketing sample**: Load Marketing preset; inline and ensure CTA/button styles appear inline.
- **Newsletter sample**: Load Newsletter preset; inline and ensure headings/lists inline correctly.
- **Keep style tag toggle**: Run once with toggle on (style tag remains), once off (style tag removed); verify output matches choice.
- **Beautify toggle**: Enable “Beautify output” and inline; output should be pretty-formatted with newlines/indents.
- **Preview toggle**: Disable/enable “Show preview” and confirm the preview panel hides/shows without affecting output.
- **Complex selector warning**: Add an unsupported/complex selector; inline; ensure it is skipped and listed under “Skipped selectors/media” with no crash.
- **Large/empty guard**: Try empty HTML → inline should show an inline error; paste extremely large HTML (>200k chars) → shows size warning and blocks.
- **Copy/download**: After inlining, use “Copy” and “Download” to confirm clipboard and downloaded `inlined.html` contain the inline styles.
- **Accessibility**: Screen-reader text updates via `aria-live`; output/preview regions have labels; buttons/checkboxes are focusable with visible focus rings.
- **Media flatten toggle**: Paste HTML with `@media (max-width:)` rules, enable “Flatten max-width media”, inline, and confirm the mobile-first declarations apply inline plus the original media query remains.
- **Diff panel**: Inline HTML/CSS changes and confirm the diff highlights added/removed text; ensure the diff panel appears even when the preview is hidden.
- **Email client warnings**: Use flexbox, position, and advanced selectors; confirm warnings show with suggested alternatives.
- **Outlook-safe output**: Enable “Outlook-safe output” with flex layouts and confirm table rewrites happen plus VML blocks (if present) remain.
- **Legacy attributes**: Enable “Legacy attributes” and confirm `bgcolor`, `align`, `valign`, and width/height attributes appear where expected.
