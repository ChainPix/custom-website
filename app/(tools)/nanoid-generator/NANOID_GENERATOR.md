# NanoID Generator – Assessment & Plan

## Current state
- Features: Generates multiple NanoIDs with custom length, count, and alphabet. Copy-all and reset buttons. Default URL-safe alphabet. Uses `crypto.getRandomValues`.
- UI: Simple form + output block, no presets, no sample/alphabet helper.
- Accessibility: No `aria-live` for status/copy, output not labeled as a region, buttons/inputs lack explicit aria labels beyond defaults.
- Validation: Length/Count inputs rely on min/max attributes; no inline friendly errors for out-of-range; alphabet validity only checks length > 1.
- Content/SEO: Per-page metadata present (title/description/keywords/OG/Twitter); no FAQ/How-to section; no JSON-LD schema; no privacy note.
- UX: No “runs locally” reassurance; no download option; no status text on copy; no preset lengths or alphabets.

## Gaps / Risks
- Out-of-range inputs silently clamp; users don’t get explicit guidance.
- Alphabet quality not validated for whitespace/duplicates; no quick buttons for URL-safe/letters-only/hex.
- Accessibility gaps: no region labels, no status announcements, and no aria-labels on buttons.
- No download of generated IDs; copy-only.
- No structured FAQ/JSON-LD or on-page How-to/privacy guidance.

## Immediate improvement plan
1) **Validation & UX**
   - Add inline errors/warnings for length/count out of range; show clamped values.
   - Add presets: e.g., URL-safe (default), Hex, Lowercase, Letters+Digits; length presets (10, 16, 21).
   - Add optional “unique IDs only” toggle with warning about collisions for small alphabets.
2) **Accessibility**
   - Add `aria-live` status for generate/copy/errors.
   - Label output as `role="region"` with heading; add explicit aria-labels for inputs/buttons.
3) **Output & actions**
   - Add download as `.txt`; keep copy-all with status.
   - Show count/length/alphabet summary; warn if alphabet <2 or contains whitespace only.
4) **Content/SEO**
   - Add How-to + FAQ section with privacy note (“runs locally using Web Crypto”).
   - Inject FAQPage JSON-LD in page metadata.

## Testing (add TESTING.md)
- Generate with defaults → produces 5 IDs; copy and download work.
- Length/count out of range show friendly message and clamp.
- Alphabet too short/blank shows warning and falls back to default.
- Preset buttons update alphabet/length correctly.
- Accessibility: aria-live announces generate/copy; output region labeled.

## NANOID_GENERATOR note
- Switched NanoID generation to mask/step rejection sampling for unbiased output, with a toggle for NanoID compatible vs simple mode.
- Added a Security & collision math panel with live entropy and birthday-bound collision estimates plus guidance warnings.
