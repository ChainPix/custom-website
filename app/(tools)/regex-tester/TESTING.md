# Regex Tester – Manual Test Checklist

## Scenarios
- **Valid regex, auto-run on**: Pattern `\b[A-Za-z]{4}\b`, sample text button → highlights words, matches count > 0.
- **Invalid regex**: Enter `([` → shows invalid pattern alert via aria-live, no crash.
- **Escape input**: Enable "Escape input as literal", pattern `.` should match literal `.` only.
- **Flags**: Toggle i/g/m/s and confirm output changes (e.g., case-insensitive matches increase when `i` is on).
- **Large input warning**: Paste >50k characters → warning shown.
- **Copy/Download**: With matches present, "Copy all" and "JSON"/"Download" buttons work and update status text.
- **Auto-run toggle**: Turn off auto-run, change pattern/text, click "Run" (toggle off auto-run and press Sample or adjust pattern) by hitting the "Run" button (Run test) to update matches.
- **Accessibility**: Status region announces changes; matches region has role="region" and buttons have aria-labels.

## Sample Inputs
- Pattern: `\b[A-Za-z]{4}\b` Text: `This test text finds four letter words like test, code, and more.`
- Pattern: `[A-Z]{2,}` Text: `Title: NASA HQ, acronyms like HTTP and HTML.`
- Pattern: `https?://[^\s]+` Text: `Visit https://example.com and http://test.dev/page?x=1`.
