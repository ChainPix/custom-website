# JSON ⇄ YAML Converter Tool Documentation

## Overview
JSON ⇄ YAML is a client-side converter for JSON and YAML with validation, formatting controls, round-trip diff checks, and worker-based performance for large inputs. It runs locally in your browser (no uploads).

### Primary Use Cases
- Convert config files between JSON and YAML.
- Validate JSON/YAML and spot errors with line/column hints.
- Normalize formatting (indent, wrapping, quotes, compact output).
- Run a round-trip diff to verify conversion fidelity.

## Key Features

### Conversion & Validation
- Bidirectional JSON ⇄ YAML conversion with auto-detect mode.
- YAML multi-document guardrail (multi-doc inputs are rejected with a clear error).
- Strict/coerce YAML → JSON modes for schema-safe output.
- Round-trip check: convert → convert back → diff.

### Formatting Controls
- YAML: indent size, quote style, flow level, wrap on/off + line width.
- JSON: compact output, unicode escaping, trailing newline.
- Preserve key order toggle (default ON).

### Performance & Limits
- Web Worker conversion for all sizes with progress stages.
- 50MB input cap, 25MB output cap to avoid memory spikes.
- Cancel button to terminate long-running conversions.

### UX & Accessibility
- Monaco editor input/output with syntax highlighting.
- Drag & drop file loading + filename-preserving download.
- Copy output, download, and error UX with line/column jump.
- Keyboard shortcuts: Ctrl/Cmd+Enter convert, Ctrl/Cmd+L clear, Ctrl/Cmd+S download.

## Quick Start
1. Paste JSON/YAML, drop a file, or load a sample.
2. Choose direction or Detect input type.
3. Adjust formatting options (indent, wrap, strict/coerce).
4. Convert or run a round-trip check.
5. Copy or download the output.

## Options Reference

### YAML Options
- **Indent:** 2/4/8 spaces.
- **Quote style:** single or double.
- **Flow level:** block-only or flow for nested levels.
- **Wrap:** on/off with line width.

### JSON Options
- **Compact:** no whitespace.
- **Escape unicode:** `\u` escapes for non-ASCII.
- **Trailing newline:** append newline at end.

### Schema / Type Guard (YAML → JSON)
- **Strict JSON:** reject Date/Map/Set/NaN/Infinity/etc.
- **Coerce:** Date → ISO string, NaN/Infinity → null, Map/Set → object/array.

## Limits & Guardrails
- **Max input:** 50MB.
- **Max output:** 25MB (shows friendly error).
- **Multi-doc YAML:** not supported (inputs with `---` are rejected).

## Privacy & Data Handling
- All processing happens in your browser (no uploads).
- Preferences stored locally (`localStorage`).
- Clipboard access is user-triggered only.

## Keyboard Shortcuts
- **Ctrl/Cmd+Enter:** convert
- **Ctrl/Cmd+L:** clear
- **Ctrl/Cmd+S:** download

## SEO & Structured Data
- Rich metadata (title, description, keywords, canonical URL).
- OpenGraph and Twitter cards.
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage.
- On-page FAQ and privacy callout.

## File Structure
```
app/(tools)/json-yaml/
├── README.md               # This documentation
├── client.tsx              # UI, options, worker wiring, shortcuts
├── json-yaml.worker.ts     # Parsing, conversion, round-trip in worker
├── page.tsx                # Metadata + JSON-LD schema
└── layout.tsx              # Layout wrapper
```

## Dependencies
- `js-yaml` for YAML parsing/serialization.
- `@monaco-editor/react` for editor UI.
- `lucide-react` icons.

## Testing
- Manual checks in `app/(tools)/json-yaml/TESTING.md`.

## Troubleshooting
- **“Multi-doc not supported”**: remove `---` or split docs.
- **“Output exceeds 25MB”**: reduce input size or formatting.
- **“Clipboard blocked”**: browser denied permission; copy manually.

## Roadmap
- Multi-document YAML support.
- Schema-aware validation presets (JSON Schema, YAML schema toggles).
- Output-only download mode for very large conversions.
