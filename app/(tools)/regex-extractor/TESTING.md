# Regex Extractor – Manual Test Checklist

## Scenarios
1) **Valid pattern**
   - Use default/sample; matches and capture groups populate the table with counts.
2) **Invalid/empty pattern**
   - Clear pattern or enter invalid regex → inline warning shows; no matches returned.
3) **Samples & swap**
   - Load “emails” and “URLs” samples; inputs update and status shows “Loaded sample”.
   - Swap pattern/text → they swap and status updates.
4) **Copy/Download**
   - Copy pattern, Copy CSV; Save JSON/CSV → files/text produced; status/”Copied” badge updates.
5) **Size guard/truncation**
   - Large input (>30k chars) shows warning; matches capped at 500 with truncation warning.
6) **Flags/helper**
   - Toggle i/m/s flags; escape helper updates pattern; global is forced on.
7) **Accessibility**
   - aria-live announces status; results region labeled; controls have aria-labels/focus states.
