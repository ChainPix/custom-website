# TOML ⇄ YAML Converter – Manual Test Checklist

## Core flows
- TOML → YAML: paste valid TOML, Convert → YAML output appears; copy/download work.
- YAML → TOML: paste valid YAML object, Convert → TOML output appears; copy/download work.
- Auto-convert: toggle on, change input → output updates after debounce.
- Sort keys option: toggle and confirm order changes in output.

## Validation
- Invalid TOML/YAML shows line/column error; output clears.
- Oversize input (>10MB) shows size error on upload; large input warning shows above ~1MB.
- Mixed arrays (objects + primitives) show the custom error; arrays with null/undefined throw errors.
- File upload: accepts .toml/.yaml/.yml or text; rejects unsupported types.

## Accessibility
- `aria-live` status/error; output region labeled; inputs/buttons focusable and have labels.

## Sample inputs
- TOML sample (`test-data/sample.toml`): converts to YAML cleanly.
- YAML sample (`test-data/sample.yaml`): converts to TOML cleanly.
