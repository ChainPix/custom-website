# TOML/INI → JSON Converter – Manual Test Checklist

## Scenarios
1) **Valid conversion**
   - Paste valid TOML and INI samples; output JSON renders; status shows parsed.

2) **Invalid input**
   - Malformed TOML shows clear error (with line/column if available); invalid INI shows format error.

3) **Samples & reset**
   - Load TOML/INI samples (simple/nested); reset restores defaults; swap mode updates status.

4) **Copy/Download**
   - Copy JSON output and Copy original input; Download JSON → status updates.

5) **Size guard & formatting**
   - Large input (>40k chars) shows warning; pretty/minify toggle updates input/output.

6) **Accessibility**
   - aria-live announces status; output region labeled; controls have aria-labels/focus states.
