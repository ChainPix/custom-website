# WebP Image Converter

- Version: 1.3.2
- Category: Generation & Utilities
- Last Updated: 2025-12-24
- Status: Stable

## Overview
Client-side WebP converter for JPG/PNG/GIF images. Converts locally in the browser with quality presets, optional resize, and batch processing. No uploads.

## Key Features
- Batch conversion with per-item status and errors
- Quality presets: Low (50%), Medium (70%), High (80%), Max (95%)
- Resize during conversion with aspect ratio lock
- Individual download or Download All (zip)
- File validation (type, size, zero-byte) and 30s timeout
- Per-item preview and size savings display

## How to Use
1) Set quality (slider or preset) before uploading.
2) Optional: enable resize and set width/height.
3) Upload one or multiple images (max 10MB each).
4) Download individual files or Download All as a zip.

## Limits & Notes
- Max file size: 10MB per image
- Batch processing is sequential to reduce memory pressure
- WebP encoding requires modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- EXIF orientation is not preserved (rotate before upload if needed)
- Animated GIFs export the first frame only

## Limitations
- Safari < 14 cannot encode WebP (viewing works, export fails)
- Very large/complex images can be slow or hit the 30s timeout
- Large images may spike memory usage on low-end devices
- No lossless WebP mode (lossy only)
- No animated WebP output

## Todos
- Add Playwright smoke tests for core flows (batch, presets, resize, errors)
- Add unit tests for validation helpers
- Add error boundary and clearer memory-related messaging
- Add before/after comparison slider
- Add preview zoom modal
- Add progress bar per item

## Changelog
### v1.3.2 (2025-12-24)
- Added batch conversion support
- Added quality presets and resize options
- Added custom filename and size savings display
- Added per-item errors and 30s timeout
- Added Download All as zip
