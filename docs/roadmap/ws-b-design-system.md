# WS-B — Design System & UX Consistency

Shared primitives first (cheap to adopt in WS-C), then consistency sweeps.

## Core components (components/)
- [ ] B1 ToolShell v2: standard header (h1+description), options bar slot, status bar slot
- [ ] B2 SplitPane: resizable input/output panes with keyboard resize + persist ratio
- [ ] B3 Fullscreen toggle for editor panes
- [ ] B4 Swap-panes button primitive (used by every converter)
- [ ] B5 FileDrop zone component (see A40 — lives here, tracked once)
- [ ] B6 StatusBar: chars/lines/bytes + parse state + timing, aria-live polite
- [ ] B7 Toast component (see A36 — implementation item)
- [ ] B8 Tabs component (accessible, arrow-key navigation)
- [ ] B9 Select/Dropdown styled component (replaces bare <select> variance)
- [ ] B10 Toggle/Switch component with label + description slot
- [ ] B11 NumberInput with increment buttons and min/max clamp
- [ ] B12 TextareaAutosize shared component
- [ ] B13 Tooltip component (hover + focus, escape to dismiss)
- [ ] B14 Kbd component for shortcut hints
- [ ] B15 EmptyState component (icon, message, primary action)
- [ ] B16 ErrorPanel: message + line/col + snippet + caret (standardize parser errors)
- [ ] B17 SampleButton: "Load example" standard button wired to per-tool fixtures
- [ ] B18 DownloadButton wrapping lib/download.ts (filename + MIME per tool)
- [ ] B19 ShareButton wrapping lib/share-url.ts
- [ ] B20 OptionsBar layout primitive (wraps, collapses to accordion on mobile)
- [ ] B21 Monaco wrapper component: single lazy loader, theme-aware, a11y labels
- [ ] B22 CodeBlock (read-only highlighted output for non-Monaco tools)
- [ ] B23 Badge component (format detected, mode indicators)
- [ ] B24 Spinner/ProgressBar for worker jobs with cancel button slot

## Design tokens & foundation
- [ ] B25 Color tokens as CSS variables (pairs with A23 dark mode)
- [ ] B26 Spacing/radius/shadow token audit — one shadow scale, one radius scale
- [ ] B27 Typography scale: consistent h1/h2/body/mono sizes across tools
- [ ] B28 Tailwind config: encode tokens so raw hex/slate-* stops spreading
- [ ] B29 Icon set: pick one (lucide-react already?) and remove ad-hoc SVGs
- [ ] B30 Motion tokens: standard durations/easings, respect reduced-motion

## Consistency sweeps (site-wide passes)
- [ ] B31 Button hierarchy sweep: primary/secondary/ghost applied consistently
- [ ] B32 Every action button gets disabled state + reason tooltip when disabled
- [ ] B33 Input/output pane header pattern identical across all converters
- [ ] B34 Consistent option label casing and help text tone across tools
- [ ] B35 Mobile audit wave 1: converters usable at 360px (panes stack)
- [ ] B36 Mobile audit wave 2: generators/utilities at 360px
- [ ] B37 Tap-target audit: all interactive elements ≥44px on touch
- [ ] B38 Empty-input states: consistent placeholder + example CTA everywhere
- [ ] B39 Success feedback convention: when output updates, polite announce
- [ ] B40 Truncation/overflow audit: long strings never break layout
- [ ] B41 Form control focus order audit on all 50 tools
- [ ] B42 Remove dead CSS / unused Tailwind classes sweep
- [ ] B43 favicon + app icons set (pairs with A29 manifest)
- [ ] B44 OG default image + per-category OG images
- [ ] B45 Landing grid card design refresh (icon, hover, featured badge)
