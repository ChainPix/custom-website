# TOML/INI/JSON Converter – Manual Test Checklist

## Scenarios
1) **Valid conversion**
   - Paste valid TOML/INI/JSON samples; output renders in chosen format; status shows converted or formatted.

2) **Invalid input**
   - Malformed TOML shows clear error (with line/column if available); invalid INI/JSON shows format error.

3) **Samples & reset**
   - Load TOML/INI/JSON samples; reset restores defaults; swap formats updates input/output formats and status.

4) **Copy/Download**
   - Copy output and Copy original input; Download output with the correct extension → status updates.

5) **Size guard & formatting**
   - Large input (>40k chars) shows warning; pretty output toggle updates output formatting.

6) **Lossy warnings**
   - Converting TOML↔INI shows lossy warning panel entries; comment-containing input warns about comment loss.

7) **Schema validation**
   - Enable schema validation with a simple schema; invalid types show errors with JSON Pointer paths.

8) **Editor experience**
   - Monaco highlights TOML/INI/JSON; parse errors show squiggles; Ctrl/Cmd+Shift+F formats input.

9) **Accessibility**
   - aria-live announces status; output region labeled; controls have aria-labels/focus states.
