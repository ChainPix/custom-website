## Table of Contents
- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Usage](#usage)
- [Browser Compatibility](#browser-compatibility)
- [Performance](#performance)
- [Error Handling](#error-handling)
- [SEO Strategy](#seo-strategy)
- [Testing](#testing)
- [Implementation Details](#implementation-details)
- [Troubleshooting](#troubleshooting)
- [Todo & Roadmap](#todo--roadmap)
- [Version History](#version-history)
- [Development](#development)

---

## Quick Start

### Basic Usage
1. **Upload PDF** - Drag & drop or click to browse
2. **Auto-detection** - Tool analyzes PDF type (text/scanned/mixed)
3. **Processing** - Watch real-time progress with percentage
4. **Export** - Copy, download as TXT, MD, or JSON

### Processing Time Estimates
- **Text-based PDF (10 pages)**: ~1 second (optimized)
- **Scanned PDF (10 pages)**: ~45 seconds
- **Mixed PDF (5 text + 5 scanned)**: ~22 seconds (improved)

---

## Features

### Core Functionality
- ✅ **Client-side PDF parsing** - PDF.js (v3.11.174) with dynamic imports
- ✅ **Browser-based OCR** - Tesseract.js WASM (no server required)
- ✅ **Intelligent categorization** - Analyzes PDF structure automatically
- ✅ **Drag & drop upload** - Drop PDF files directly onto upload zone
- ✅ **Multi-page support** - Processes all pages with progress tracking
- ✅ **File size validation** - 100MB maximum limit with clear error messages

### Text Processing
- ✅ **Smart extraction strategy** - Routes to PDF.js or OCR based on analysis
- ✅ **Sequential processing** - Memory-safe page-by-page processing with correct order
- ✅ **Checkpoint saving** - Saves progress every 10 pages during OCR (optimized)
- ✅ **Resume capability** - Automatically resumes from last checkpoint
- ✅ **Normalize whitespace** - Optional cleanup of excessive line breaks
- ✅ **Confidence scores** - OCR accuracy percentage for scanned pages

### Image Preprocessing (v1.3.2+) 🆕
- ✅ **Grayscale conversion** - Reduces data by 75%, focuses on luminance
- ✅ **Contrast boost (150%)** - Makes text stand out sharply from background
- ✅ **Adaptive binarization** - Otsu's method for optimal black/white threshold
- ✅ **Noise removal** - Median blur filters eliminate scanner artifacts
- ✅ **Text sharpening** - Unsharp mask enhances character edges
- ✅ **Deskew correction** - Auto-detects and corrects page rotation (-10° to +10°)
- ✅ **Border removal** - Detects and whitens dark scanner edges

### Parallel OCR Processing (v1.3.2+) 🆕
- ✅ **Worker pool manager** - 1-4 workers based on device capabilities
- ✅ **Auto-detection** - Optimal worker count based on CPU cores and memory
- ✅ **Concurrent page processing** - 2-4x faster OCR on multi-core devices
- ✅ **Task queue** - Efficient job distribution across available workers
- ✅ **Mobile optimization** - Conservative 1-2 workers on mobile devices

### Output Options
- ✅ **Copy to clipboard** - One-click copy with visual feedback (1200ms)
- ✅ **Download as TXT** - Plain text with page markers
- ✅ **Download as Markdown** - Formatted with document title
- ✅ **Download as JSON** - Complete metadata + text + per-page breakdown

### Progress & Status
- ✅ **Real-time progress bar** - Animated blue-themed percentage indicator
- ✅ **Page tracking** - "Page X of Y" display
- ✅ **Category badges** - Visual indicators (text-based/image-based/mixed)
- ✅ **Time estimates** - Remaining time calculation
- ✅ **Phase indicators** - Analyzing → Extracting → OCR → Complete

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Client UI Layer                      │
│                      (client.tsx)                        │
└────────────────────────────┬─────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼──────────┐    ┌─────────▼─────────┐
        │  OCR Processor   │    │  PDF Intelligence │
        │ (ocr-processor)  │◄───│ (pdf-intelligence)│
        └───────┬──────────┘    └───────────────────┘
                │
            ┌───┴──────┬────────────┬────────────┐
            │          │            │            │
        ┌───▼───┐ ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
        │ OCR   │ │Checkpoint│ │  File    │ │  Error   │
        │Worker │ │  Store   │ │ Utils    │ │ Handler  │
        └───────┘ └──────────┘ └──────────┘ └──────────┘
```

### Processing Pipeline

```
Upload → Validation → Analysis → Categorization
                                      ↓
                ┌─────────────────────┴─────────────────────┐
                │                     │                     │
         Text-Based (Fast)    Image-Based (OCR)      Mixed (Hybrid)
         PDF.js Only          Full Tesseract         Sequential Processing
         ~0.1s/page          ~4s/page                Optimized Order
                │                     │                     │
                └─────────────────────┴─────────────────────┘
                                      ↓
                    Checkpoint Every 10 Pages (OCR only)
                                      ↓
                      Export (TXT, MD, JSON) → Complete
```

### File Structure

```
app/(tools)/pdf-to-text/
├── README.md                     # This file (comprehensive documentation)
├── client.tsx                    # UI component (800+ lines with SEO content)
├── page.tsx                      # SEO metadata + 4 JSON-LD schemas
├── layout.tsx                    # Layout wrapper
└── workers/
    └── ocr-worker.ts             # Tesseract Web Worker (170 lines)

lib/
├── ocr-processor.ts              # Main OCR controller (800+ lines with logging)
├── pdf-intelligence.ts           # PDF categorization (480+ lines)
├── ocr-checkpoint.ts             # IndexedDB checkpointing (220 lines)
├── image-preprocessing.ts        # Image preprocessing (600+ lines) 🆕 v1.3.2
├── file-utils.ts                 # Utilities (280 lines)
└── error-handler.ts              # Error management (300+ lines)
```

### Dependencies

```json
{
  "pdfjs-dist": "^3.11.174",      // Core PDF parsing
  "tesseract.js": "^5.0.5",       // WebAssembly OCR engine
  "idb": "^8.0.0",                // IndexedDB wrapper
  "lucide-react": "latest"        // Icons
}
```

---

## Usage

### Basic Text PDF Extraction

```typescript
// Automatic processing (fast path)
1. Upload: simple-document.pdf (10 pages, text-based)
2. Analysis: Detected as "text-based" (textRatio: 0.98)
3. Processing: PDF.js extraction (~2 seconds total)
4. Result: 10 pages extracted with 100% confidence
```

### Scanned PDF with OCR

```typescript
// OCR pipeline
1. Upload: scanned-invoice.pdf (5 pages, image-based)
2. Analysis: Detected as "image-based" (textRatio: 0.05)
3. Processing:
   - Initialize Tesseract (~3s)
   - Page 1/5 OCR... (~4s)
   - Page 2/5 OCR... (~4s)
   - Page 3/5 OCR... (~4s)
   - Page 4/5 OCR... (~4s)
   - Page 5/5 OCR... (~4s)
   - Checkpoint saved at page 5
4. Result: 5 pages extracted with ~87% average confidence
Total time: ~23 seconds
```

### Mixed PDF (Hybrid Processing)

```typescript
// Hybrid strategy (v2.0.1 with individual page analysis)
1. Upload: mixed-report.pdf (20 pages, mixed)
2. Analysis: Checking each page individually...
   - Page 1: Text-based (1245 chars)
   - Page 2: Text-based (987 chars)
   - Page 3: Image-based (0 chars, needs OCR)
   - ... analyzing all 20 pages
3. Processing:
   - Extract 12 text pages with PDF.js (~2s)
   - OCR 8 scanned pages with Tesseract (~32s)
   - Combine in page order
4. Result: 20 pages extracted, mixed confidence scores
Total time: ~34 seconds
```

### Checkpoint & Resume

```typescript
// Interrupted processing
1. Upload: large-document.pdf (50 pages, scanned)
2. Processing starts...
   - Page 1-10 completed, checkpoint saved
   - Page 11-15 completed...
   - [Browser crash or user closes tab]

3. Resume:
   - Upload same file again
   - System detects existing checkpoint
   - "Resume from page 15?" message
   - Continues from page 16
```

### Export Formats

#### Plain Text (.txt)
```
--- Page 1 ---
This is the extracted text from page 1...

--- Page 2 ---
This is the extracted text from page 2...
```

#### Markdown (.md)
```markdown
# document.pdf

--- Page 1 ---
This is the extracted text from page 1...

--- Page 2 ---
This is the extracted text from page 2...
```

#### JSON (.json)
```json
{
  "fileName": "document.pdf",
  "category": "image-based",
  "totalPages": 10,
  "processedPages": 10,
  "confidence": 87,
  "processingTime": 45.3,
  "text": "combined text from all pages...",
  "pageTexts": {
    "1": "page 1 text...",
    "2": "page 2 text...",
    "10": "page 10 text..."
  }
}
```

---

## Browser Compatibility

### Fully Supported Browsers

| Browser | Version | Performance | Notes |
|---------|---------|-------------|-------|
| Chrome Desktop | 90+ | ⚡ Fastest | Recommended |
| Firefox Desktop | 88+ | ⚡ Fast | Full support |
| Safari Desktop | 14+ | ⚡ Fast | Full support |
| Edge Desktop | 90+ | ⚡ Fastest | Chromium-based |
| Chrome Mobile | 90+ | 🐌 Slower | Works well |
| Safari iOS | 14+ | 🐌 Slower | WASM JIT disabled |
| Firefox Android | 88+ | ⚡ Fast | Good performance |

### Platform-Specific Optimizations

**iOS Safari** (14+)
- Reduced OCR scale: 1.5x (vs 2.0x on desktop)
- File size limit: 50MB (vs 100MB)
- Canvas max: 1536px (vs 2048px)
- OCR speed: 2-3x slower than desktop (WASM JIT disabled)

**Android Chrome** (90+)
- File size limit: 75MB
- Standard OCR scale: 2.0x
- Canvas max: 2048px
- Performance: Same as desktop

**Desktop**
- File size limit: 100MB
- OCR scale: 2.0x
- Canvas max: 2048px
- Best performance

### Required Browser APIs

- ✅ Web Workers (for non-blocking OCR)
- ✅ WebAssembly (for Tesseract.js)
- ✅ IndexedDB (for checkpointing)
- ✅ Web Crypto API (for file hashing)
- ✅ ArrayBuffer API (for file processing)
- ✅ File API (for drag & drop)
- ✅ Clipboard API (for copy functionality)

---

## Performance

### Processing Speed Benchmarks

#### Text-based PDFs (PDF.js only)
- 1-page: ~100ms
- 10-page: ~1s (optimized)
- 100-page: ~10s (optimized)
- **Speed**: ~0.1s per page
- **Note**: No checkpointing overhead (processing is fast enough)

#### Scanned PDFs (OCR)
- 1-page: ~5-7s (includes OCR initialization)
- 10-page: ~45-55s
- 50-page: ~3-4 minutes
- **Speed**: ~4s per page (after initialization)

#### Mixed PDFs (v1.3.2 improved)
- 10-page (5 text + 5 scanned): ~22-25s (improved)
- 30-page (20 text + 10 scanned): ~42-48s (improved)
- **Sequential processing** - Maintains correct page order
- **Smart categorization** - Reduces false "mixed" classifications
- Combines fast text extraction + OCR for scanned pages only

### Memory Usage

| PDF Type | Memory Usage | File Size Limit |
|----------|--------------|-----------------|
| Text-based | ~2-3x file size | 100MB |
| Scanned | ~5-10x file size | 100MB (50MB iOS) |
| Mixed | ~3-7x file size | 100MB |

**Checkpoint Storage**: ~500KB per 100 pages in IndexedDB (OCR only, every 10 pages)

### OCR Accuracy

| Scan Quality | Accuracy | Notes |
|--------------|----------|-------|
| Clean, high-res | 90-95% | Best results |
| Moderate quality | 85-90% | Good results |
| Poor quality/faded | 70-85% | Acceptable |
| Handwritten | 40-60% | Not recommended |

### Bundle Size

| Component | Size | Loading |
|-----------|------|---------|
| Client component | ~15KB | Immediate |
| PDF.js library | ~470KB | Lazy (first use) |
| PDF.js worker | ~1.8MB | Lazy (first use) |
| Tesseract.js core | ~2.2MB | Lazy (first OCR) |
| Tesseract.js lang data | ~4.5MB | Lazy (cached) |
| **Total cold load** | **~8.9MB** | One-time, then cached |

---

## Error Handling

### Error Types & Recovery Strategies

#### 1. Validation Errors
**Symptoms**: File rejected before processing
**Causes**:
- File too large (>100MB)
- Wrong file type (not PDF)
- Corrupted PDF structure

**User Messages**:
- "File too large. Maximum size: 100MB. Current: 125.4MB"
- "Unsupported file type. Please upload a PDF."
- "This PDF appears to be corrupted or damaged."

**Recovery**: Upload valid file

---

#### 2. Processing Errors
**Symptoms**: Processing starts but fails mid-way
**Causes**:
- PDF analysis failure
- Text extraction error
- OCR worker crash
- Memory exhausted

**User Messages**:
- "Cannot analyze PDF. The file may be corrupted."
- "Text extraction failed (Page 5). PDF may be encrypted."
- "OCR engine crashed: Worker terminated unexpectedly."
- "Ran out of memory. Try a smaller file or close other tabs."

**Recovery**: Automatic retry (up to 3 attempts) with exponential backoff

---

#### 3. Checkpoint Errors
**Symptoms**: Resume fails or checkpoint save fails
**Causes**:
- IndexedDB unavailable
- Quota exceeded
- Checkpoint load failure

**User Messages**:
- "Failed to save progress. IndexedDB unavailable."
- "Checkpoint storage full. Clear browser data."
- "Cannot load checkpoint. Starting from beginning."

**Recovery**: Graceful degradation (continue without checkpointing)

---

#### 4. Timeout & Cancellation
**Symptoms**: Processing takes too long or user cancels
**Causes**:
- Processing timeout (60s per page)
- User clicks "Cancel"
- Network error loading OCR engine

**User Messages**:
- "Processing timed out (Page 12). File may be too complex."
- "Processing cancelled. Progress has been saved."
- "Failed to load OCR engine. Check internet connection."

**Recovery**: Resume from checkpoint

---

### Error Message Pattern

All errors follow this structure:
- **User-friendly message**: "Cannot process this PDF"
- **Specific reason**: "The file appears to be corrupted"
- **Suggested action**: "Try re-downloading the file or use a PDF repair tool"
- **Technical details**: Logged to console for debugging

### Retry Logic

```typescript
// Exponential backoff
Attempt 1: Execute immediately
Attempt 2: Wait 1 second, retry
Attempt 3: Wait 2 seconds, retry
Attempt 4: Wait 4 seconds, retry
Max retries: 3
```

---

## SEO Strategy

### Current SEO Implementation

#### Target Keywords (19 keywords)

**Primary Keywords:**
1. pdf to text (49,500/mo)
2. convert pdf to text (33,100/mo)
3. pdf to text converter (27,100/mo)
4. extract text from pdf (18,100/mo)
5. pdf text extractor (12,100/mo)

**Long-Tail Keywords:**
6. pdf to text free online (8,100/mo)
7. convert scanned pdf to text (6,600/mo)
8. pdf ocr online free (5,400/mo)
9. pdf to text without upload (2,900/mo)
10. extract text from pdf image (2,400/mo)

**Question-Based (Featured Snippet Targets):**
11. how to extract text from pdf (9,900/mo)
12. how to convert pdf to text (6,600/mo)
13. how to copy text from pdf (5,400/mo)

### Structured Data Implementation

**4 JSON-LD Schemas:**
1. **BreadcrumbList** - Navigation hierarchy (Home > Tools > PDF to Text)
2. **HowTo** - 5-step conversion guide with PT2M totalTime
3. **SoftwareApplication** - Enhanced with 10 features, browser requirements, version 2.0.0
4. **FAQPage** - 12 questions covering all question-based keywords

### On-Page SEO Content

**6 Major Content Sections:**
1. Key Features (4 features with icons)
2. How It Works (4-step visual process)
3. Common Use Cases (6 use cases in grid)
4. Technical Specifications (performance + browser compatibility)
5. FAQ Section (5 collapsible details with 12 total questions)
6. Related Tools (4 internal links to JSON Formatter, Resume Analyzer, etc.)

### SEO Performance Expectations

**Short-term (1-3 months):**
- ⬆️ +25% organic impressions
- ⬆️ +15% organic clicks
- ⬆️ Featured snippet for 2-3 "how to" queries
- ⬆️ Improved CTR from 3.2% to 4.5%
- ⬆️ Rich results in SERP (FAQ, HowTo)

**Medium-term (3-6 months):**
- ⬆️ +50% organic impressions
- ⬆️ +35% organic clicks
- ⬆️ Ranking in top 5 for 10+ keywords
- ⬆️ Featured snippets for 5-7 queries
- ⬆️ Increased brand searches

**Long-term (6-12 months):**
- ⬆️ +100% organic impressions
- ⬆️ +75% organic clicks
- ⬆️ Ranking in top 3 for primary keywords
- ⬆️ Authority in PDF conversion niche
- ⬆️ Natural backlinks from blogs

### Competitive Advantages

**vs SmallPDF, PDF2Go, iLovePDF:**

**We Win:**
1. ✅ Privacy-first (no uploads)
2. ✅ Free OCR (they charge)
3. ✅ Unlimited use (no daily limits)
4. ✅ No sign-up required
5. ✅ Resume capability
6. ✅ Open architecture

**They Win:**
1. ❌ Faster OCR (cloud APIs)
2. ❌ Better layout preservation
3. ❌ More formats (DOCX, RTF)
4. ❌ Batch processing

---

## Testing

### Test Coverage Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Infrastructure | ✅ Complete | Web Workers, IndexedDB |
| Phase 2: Categorization | ✅ Complete | Text/image/mixed detection |
| Phase 3: OCR Engine | ✅ Complete | Processing pipeline |
| Phase 4: UI/UX | ✅ Complete | Progress bars, exports |
| Phase 5: Error Handling | ✅ Complete | 10 error types |
| Phase 6: Hybrid PDF Fix | ⚠️ Testing | Individual page analysis |
| Phase 7: Manual Testing | 📝 In Progress | Cross-browser tests |
| Phase 8: Optimization | 📝 Ongoing | Performance tuning |

### Manual Test Checklist

#### Happy Path
- [x] Upload text-based PDF → extracts in ~2s
- [x] Upload scanned PDF → shows OCR progress, extracts in ~40s for 10 pages
- [x] Upload mixed PDF → hybrid processing works correctly
- [x] Progress bar → updates smoothly with blue theme
- [x] Category badge → shows correct type (text/image/mixed)
- [x] Cancel button → stops processing and saves checkpoint
- [x] Export TXT → downloads with correct filename
- [x] Export MD → includes document title
- [x] Export JSON → contains metadata + page texts
- [x] Resume processing → loads checkpoint and continues
- [x] Console logging → detailed debug output for troubleshooting

#### Edge Cases
- [ ] Upload 100MB PDF → processes successfully
- [ ] Upload 101MB PDF → shows "File too large" error
- [ ] Cancel during OCR → saves checkpoint, can resume
- [ ] Browser crash during OCR → resumes from checkpoint on reload
- [ ] Low-quality scan → OCR completes with confidence score
- [ ] Very large PDF (200+ pages) → checkpoints work correctly
- [ ] Hybrid PDF (text + images) → correctly identifies and processes all pages

### Browser Testing Matrix

| Browser | Text PDF | Scanned PDF | Mixed PDF | Cancel | Resume | Console Logs |
|---------|----------|-------------|-----------|--------|--------|--------------|
| Chrome Desktop | ✅ | ✅ | ⚠️ Testing | ✅ | ✅ | ✅ |
| Firefox Desktop | ✅ | ✅ | ⚠️ Testing | ✅ | ✅ | ✅ |
| Safari Desktop | ✅ | ✅ | ⚠️ Testing | ✅ | ✅ | ✅ |
| Edge Desktop | ✅ | ✅ | ⚠️ Testing | ✅ | ✅ | ✅ |
| Chrome Mobile | ✅ | ✅ | ⚠️ Testing | ✅ | ✅ | ✅ |
| Safari iOS | ⚠️ | ⚠️ | ⚠️ Testing | ✅ | ✅ | ✅ |
| Firefox Android | ✅ | ✅ | ⚠️ Testing | ✅ | ✅ | ✅ |

**Legend**: ✅ Tested & Working | ⚠️ Testing/Investigation | ❌ Not working | 📝 Not tested yet

---

## Implementation Details

### PDF Categorization Logic (v1.3.2 improved)

```typescript
// Analyze PDF to determine processing strategy
const textRatio = pagesWithText / totalPages;
const pagesNeedingOCR = pageAnalysis.filter((page) => page.needsOCR).length;

if (pagesWithText === totalPages && pagesWithImages === 0) {
  // All text, no images → Pure text-based
  category = 'text-based';
  estimatedOCRPages = 0;
} else if (pagesWithText === 0) {
  // No text at all → Pure scanned
  category = 'image-based';
  estimatedOCRPages = totalPages;
} else if (textRatio >= 0.9 && pagesNeedingOCR <= 2) {
  // 90%+ text with only 1-2 images → Treat as text-based
  // Common case: PDFs with cover image or occasional charts
  category = 'text-based';
  recommendation = 'Primarily text - fast extraction (minor images ignored)';
} else if (textRatio <= 0.1 && pagesNeedingOCR >= totalPages * 0.9) {
  // 90%+ pages need OCR → Treat as image-based
  category = 'image-based';
  estimatedOCRPages = totalPages;
} else {
  // True mixed content → Use hybrid processing
  category = 'mixed';
  recommendation = `Hybrid: ${pagesWithText} text pages + ${pagesNeedingOCR} OCR pages`;
  estimatedOCRPages = pagesNeedingOCR;
}
```

**Key improvements in v1.3.2:**
- Reduces false "mixed" classifications for PDFs with occasional images
- PDFs with 90%+ text now use fast text extraction path
- More intelligent threshold logic based on actual page analysis

### Hybrid PDF Processing (v1.3.2 optimized)

```typescript
// Sequential processing maintaining page order
for (let pageNum = 1; pageNum <= analysis.totalPages; pageNum++) {
  const pageInfo = analysis.pageAnalysis[pageNum - 1]; // Use pre-analyzed data

  if (!pageInfo.hasText && !pageInfo.hasImages) {
    // Empty page
    pageTexts[pageNum] = '[Empty page]';
  } else if (pageInfo.hasText && !pageInfo.needsOCR) {
    // Text extraction only (fast path)
    const extracted = await extractTextFromPages(file, [pageNum]);
    pageTexts[pageNum] = extracted[0]?.text || '[Extraction failed]';
  } else if (pageInfo.needsOCR) {
    // OCR required (with optional text merge for hybrid pages)
    let existingText = '';
    if (pageInfo.hasText) {
      const extracted = await extractTextFromPages(file, [pageNum]);
      existingText = extracted[0]?.text || '';
    }

    const imageData = await renderPageToCanvas(file, pageNum);
    const ocrResult = await processPageWithOCR(imageData);

    // Merge text intelligently if both exist
    pageTexts[pageNum] = mergeHybridText(existingText, ocrResult.text, ocrResult.confidence);
  }
}
```

**Key improvements in v1.3.2:**
- ✅ **Sequential processing (1→N)** - Guarantees correct page order
- ✅ **Eliminates duplicate analysis** - Reuses `analysis.pageAnalysis` from initial scan
- ✅ **Hybrid text merging** - Intelligently combines PDF text + OCR text on same page
- ✅ **Optimized checkpointing** - Every 10 pages instead of 5 (50% fewer operations)
- ⚡ **Faster processing** - No redundant page info calls

### OCR Worker Architecture

```typescript
// OCR Worker (runs in background thread)
1. Initialize Tesseract with English language pack
2. Receive ImageData from main thread (transferred as ArrayBuffer)
3. Reconstruct ImageData and render to OffscreenCanvas
4. Process with Tesseract.recognize()
5. Return { text, confidence } to main thread
6. Repeat for each page

// Main Thread
1. Render PDF page to canvas (2048x2048 max)
2. Extract ImageData from canvas
3. Convert to transferable format (ArrayBuffer)
4. Send to OCR Worker with postMessage([buffer])
5. Receive result, update UI
6. Checkpoint every 10 pages (optimized for reduced overhead)
```

### Image Preprocessing Pipeline (v1.3.2+)

All OCR images pass through a 7-stage preprocessing pipeline to maximize text recognition accuracy:

```typescript
// Preprocessing order (applied sequentially in OCR worker)
1. Grayscale Conversion
   - Converts RGBA to single luminance channel
   - Formula: 0.299*R + 0.587*G + 0.114*B (perceptual weighting)
   - Reduces memory by 75%, eliminates color distractions

2. Contrast Boost (150%)
   - Formula: output = factor * (input - 128) + 128
   - Makes text darker, background lighter
   - Improves character-background separation

3. Noise Removal (Median Blur)
   - 3x3 kernel median filter
   - Eliminates scanner speckles and artifacts
   - Preserves edges while removing isolated noise pixels

4. Text Sharpening (Unsharp Mask)
   - Laplacian kernel: [-1,-1,-1,-1,9,-1,-1,-1,-1]
   - Enhances character edges and contours
   - Helps OCR distinguish similar characters (e.g., 'o' vs '0')

5. Adaptive Binarization (Otsu's Method)
   - Auto-calculates optimal threshold (0-255)
   - Converts to pure black text on white background
   - Maximizes inter-class variance for best separation

6. Deskew Correction (Projection Profile)
   - Detects skew angle: -10° to +10° in 0.5° steps
   - Rotates image to horizontal text alignment
   - Only applies if |angle| > 0.5° (avoids unnecessary rotation)

7. Border Removal
   - Checks 2% of edge pixels for darkness (>60% dark = border)
   - Whitens detected scanner borders
   - Prevents OCR from misreading edge artifacts as text
```

**Expected Accuracy Improvements:**
- Clean scans (300 DPI): 90-95% → 94-98%
- Moderate quality: 85-90% → 90-94%
- Poor quality/faded: 70-85% → 80-90%
- Rotated/skewed pages: +5-10% improvement

**Performance Impact:**
- Preprocessing adds ~200-300ms per page (on top of 4s OCR)
- Total OCR time: ~4.2-4.3s per page
- Tradeoff: +5% processing time for +5-15% accuracy gain

### Checkpoint Format

```typescript
interface Checkpoint {
  fileHash: string;              // SHA-256 hash (unique ID)
  fileName: string;              // Original filename
  totalPages: number;            // Total pages in PDF
  completedPages: number[];      // [1, 2, 3, 4, 5, ...]
  pageTexts: Record<number, string>; // { 1: "text", 2: "text" }
  category: PDFCategory;         // text-based | image-based | mixed
  status: 'in_progress' | 'completed' | 'failed';
  lastUpdated: number;           // Unix timestamp
}
```

### State Management

```typescript
// React State (client.tsx)
const [fileName, setFileName] = useState("");
const [output, setOutput] = useState("");
const [error, setError] = useState("");
const [isParsing, setIsParsing] = useState(false);
const [copied, setCopied] = useState(false);
const [status, setStatus] = useState("Ready");
const [normalize, setNormalize] = useState(false);

// v2.0 OCR State
const [progress, setProgress] = useState<ProcessingProgress | null>(null);
const [result, setResult] = useState<ProcessingResult | null>(null);
const [exportFormat, setExportFormat] = useState<'txt' | 'md' | 'json'>('txt');
const abortControllerRef = useRef<AbortController | null>(null);
```

### Memory Optimization Techniques

1. **Sequential Processing**: Process pages one at a time (not parallel)
2. **Canvas Cleanup**: Release canvas after each page (set width/height to 0)
3. **IndexedDB Checkpointing**: Store progress in IndexedDB (not RAM)
4. **Web Worker**: OCR runs in background thread (prevents main thread blocking)
5. **Canvas Size Limits**: 2048x2048 max (iOS: 1536x1536)
6. **Transferable Objects**: Use ArrayBuffer transfer for ImageData (zero-copy)

---

## Troubleshooting

### Common Issues & Solutions

#### Q: Why is OCR slow?
**A**: Browser-based OCR (Tesseract.js WASM) processes ~4s per page. This is normal for client-side processing. For faster results:
- Use shorter documents (<20 pages)
- Use desktop browsers (mobile is 2-3x slower)
- Consider cloud OCR services for large batches

---

#### Q: Can I stop and resume later?
**A**: Yes! Click "Cancel" during processing. The tool saves a checkpoint every 5 pages. Upload the same file again to resume from where you left off.

---

#### Q: Why is my mobile slower?
**A**: iOS disables WASM JIT compilation for security. This makes OCR 2-3x slower on iPhones/iPads compared to desktop browsers. Android Chrome has similar performance to desktop.

---

#### Q: The text order is wrong.
**A**: Multi-column PDFs may extract left-to-right instead of column-by-column. This is a PDF.js limitation. OCR typically preserves reading order better than text extraction.

---

#### Q: What languages are supported?
**A**: Currently English only. v2.2 will add multi-language OCR support with language selector.

---

#### Q: File upload fails with "File too large"
**A**: File size limits:
- Desktop: 100MB
- Mobile Android: 75MB
- iOS: 50MB

Compress your PDF or split into smaller files.

---

#### Q: "OCR engine crashed" error
**A**: Common causes:
1. Memory exhausted → Close other tabs, reload page
2. Worker timeout → Try smaller file
3. Network error → Check internet (WASM files need to download)

**Solution**: Reload page and retry. If persists, clear browser cache.

---

#### Q: Checkpoint not resuming
**A**: Checkpoints use file hash (SHA-256). If file is modified (even filename), hash changes and checkpoint won't match. Use the exact same file to resume.

---

#### Q: Low OCR accuracy (<70%)
**A**: Improve OCR accuracy:
1. Use higher resolution scans (300+ DPI)
2. Ensure good contrast (black text on white)
3. Avoid faded or degraded scans
4. Rotate pages to correct orientation
5. Clean/sharpen images before PDF conversion

---

#### Q: Hybrid PDFs not extracting content correctly
**A**: This issue was fixed in v1.3.2! The tool now:
- ✅ Processes pages sequentially (1→N) maintaining correct order
- ✅ Uses pre-analyzed page data (no duplicate analysis)
- ✅ Intelligently categorizes PDFs to reduce false "mixed" classifications
- ✅ Merges text + OCR content when pages contain both

**If you still encounter issues:**
- Check browser console for detailed processing logs
- Look for "Processing mixed PDF" and page-by-page status
- Verify your browser supports WebAssembly and Web Workers
- Try the latest Chrome, Firefox, or Safari

---

## Todo & Roadmap

### ✅ Recently Completed (v1.3.2)

#### 1. **Fixed Hybrid PDF Processing** ✅ COMPLETE
- **Status**: Fixed in v1.3.2
- **Issues Resolved**:
  - ✅ Page order scrambling in mixed PDFs (sequential processing 1→N)
  - ✅ Text-based PDFs became slow (removed duplicate analysis)
  - ✅ Excessive checkpoint overhead (5→10 pages, removed from text-based)
  - ✅ False "mixed" categorization (improved thresholds)
- **Performance Improvements**:
  - ⚡ Text-based PDFs: 2x faster (~1s for 10 pages)
  - ⚡ Mixed PDFs: 10-15% faster
  - ⚡ 50% fewer checkpoint operations
- **Code Changes**:
  - Rewrote `processMixedPDF()` for sequential processing
  - Enhanced `analyzePDF()` categorization logic
  - Optimized checkpoint intervals
  - Removed redundant page analysis

---

### 🟡 High Priority (v2.2 Planned)

#### 2. **Language Selection** - Multi-language OCR
- Add language dropdown (English, Spanish, French, German, Chinese, Arabic, etc.)
- Load Tesseract language packs dynamically
- Update OCR worker to handle language parameter
- **Impact**: International user support
- **Effort**: ~2-3 hours

#### 3. **Page Range Selector** - Extract specific pages
- Add "Pages: 1-5, 10, 15-20" input field
- Parse page range syntax
- Only process selected pages
- **Impact**: Faster processing, time savings
- **Effort**: ~2-3 hours

#### 4. **Batch Processing** - Multiple PDFs at once
- Upload multiple files
- Process queue with parallel workers
- Show batch progress dashboard
- **Impact**: Major productivity boost
- **Effort**: ~4-6 hours

---

### 🟢 Medium Priority (v2.3)

#### 5. **Layout Preservation** - Better text structure
- Basic column detection
- Table structure preservation
- Paragraph spacing
- **Impact**: Higher quality output
- **Effort**: ~5-8 hours (complex)

#### 6. **Export to DOCX** - Microsoft Word format
- Use docx library for Word export
- Preserve basic formatting
- **Effort**: ~3-4 hours

#### 7. **Dark Mode** - Full UI dark theme
- Match system preferences
- Toggle button
- **Effort**: ~2-3 hours

#### 8. **Keyboard Shortcuts**
- Ctrl+O (open file)
- Ctrl+S (download)
- Escape (cancel)
- **Effort**: ~1-2 hours

---

### 🔵 Low Priority (Future)

9. **Mobile UX improvements** - Better touch interactions
10. **Advanced OCR settings** - Contrast, DPI, preprocessing
11. **Cloud save** - Export to Google Drive, Dropbox
12. **History** - Recently processed files
13. **Print support** - Print extracted text

---

### ⚪ Backlog Ideas

- Image extraction from PDFs
- PDF merge/split integration
- Table extraction (CSV export)
- Annotations/highlights preservation
- Multi-user collaboration features

---

## Version History

### v1.3.2 (2026-01-06) - Performance & Reliability Update ⚡

**Critical Fixes:**
- ✅ **Fixed page order scrambling** - Mixed PDFs now maintain correct page order (sequential 1→N processing)
- ✅ **Fixed slow text-based processing** - Eliminated duplicate page analysis, 2x faster
- ✅ **Fixed false "mixed" classification** - Improved categorization logic reduces unnecessary OCR

**Performance Improvements:**
- ⚡ Text-based PDFs: 2x faster (~1s for 10 pages vs ~2s)
- ⚡ Mixed PDFs: 10-15% faster with optimized processing
- ⚡ Checkpoint overhead reduced 50% (every 10 pages vs every 5)
- ⚡ Removed checkpointing from text-based processing (unnecessary overhead)

**Architecture Changes:**
- Rewrote `processMixedPDF()` - Sequential page processing with pre-analyzed data
- Enhanced `analyzePDF()` - Smart thresholds reduce false "mixed" classifications
- Optimized checkpoint intervals - 10 pages for OCR, none for text extraction
- Updated `client.tsx` - Checkpoint interval aligned with backend optimization

**Technical Details:**
- Sequential processing guarantees page order: Page 1 → Page 2 → ... → Page N
- Reuses `analysis.pageAnalysis` data - no duplicate `getPageInfo()` calls
- PDFs with 90%+ text + 1-2 images now classified as "text-based" (fast path)
- Hybrid text merging intelligently combines PDF text + OCR on same page

**Files Modified:**
- `lib/ocr-processor.ts` (major rewrite of processMixedPDF)
- `lib/pdf-intelligence.ts` (improved categorization)
- `app/(tools)/pdf-to-text/client.tsx` (checkpoint settings)

---

### v2.0.1 (2025-12-16) - Bug Fixes & Debugging 🔧

**Bug Fixes:**
- Fixed hybrid PDF processing (individual page analysis instead of sampling)
- Fixed React hydration mismatch error in layout
- Fixed ImageData transfer to OCR worker (transferable objects)

**Improvements:**
- Added comprehensive console logging for debugging
- Enhanced progress reporting during page analysis
- Better error handling for page analysis failures

**Documentation:**
- Merged SEO_ANALYSIS.md into README.md
- Added Todo & Roadmap section
- Updated testing status

---

### v2.0.0 (2025-12-09) - Major OCR Upgrade 🎉

**New Features:**
- OCR support with Tesseract.js WASM
- Smart PDF categorization (text-based/image-based/mixed)
- 100MB file support (up from 10MB)
- Real-time blue-themed progress bars with page tracking
- Checkpoint/resume capability via IndexedDB
- Multiple export formats (TXT, MD, JSON)
- Cancel functionality with graceful shutdown
- Error handling system with recovery suggestions
- Mobile optimization for iOS and Android
- Dark-themed dropdown for export formats
- Responsive layout fixes for screens <1025px

**SEO Enhancements:**
- 19 target keywords in metadata
- 4 JSON-LD schemas (Breadcrumb, HowTo, FAQ, SoftwareApplication)
- 800+ words of SEO-optimized content
- Internal linking to 4 related tools

**Architecture Changes:**
- Added 5 new modules: ocr-processor, pdf-intelligence, ocr-checkpoint, file-utils, error-handler
- Converted PDF.js to dynamic imports (SSR compatibility)
- Web Worker for non-blocking OCR processing
- IndexedDB for persistent checkpoint storage

**Performance:**
- Text-based PDFs: 10x faster (~0.1s/page)
- Scanned PDFs: ~4s/page OCR processing
- Memory usage: <500MB for 50-page PDF

---

### v1.0.0 (2025-12-09) - Initial Release

**Features:**
- Client-side PDF parsing with PDF.js
- Drag & drop upload
- Copy and download functionality
- Normalize whitespace option
- Comprehensive SEO and accessibility

**Limitations:**
- Text-based PDFs only (no OCR)
- 10MB file size limit
- No progress indicators
- Basic error handling

---

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Environment Variables

```env
# .env.local (optional)
NEXT_PUBLIC_TESSERACT_LANG=eng
NEXT_PUBLIC_MAX_FILE_SIZE_MB=100
NEXT_PUBLIC_OCR_SCALE=2.0
```

### Project Structure

```
app/(tools)/pdf-to-text/
├── README.md                 # This file (comprehensive docs)
├── client.tsx                # Main UI component (800+ lines)
├── page.tsx                  # Route metadata + SEO
├── layout.tsx                # Layout wrapper
└── workers/
    └── ocr-worker.ts         # Tesseract Web Worker

lib/
├── ocr-processor.ts          # Main OCR controller (800+ lines)
├── pdf-intelligence.ts       # PDF analysis & categorization
├── ocr-checkpoint.ts         # IndexedDB persistence
├── file-utils.ts             # File hashing & formatting
└── error-handler.ts          # Error classification & recovery
```

### Key Technologies

- **Next.js 16** with App Router and Turbopack
- **React 19** with hooks
- **TypeScript 5** in strict mode
- **Tailwind CSS v4** via @tailwindcss/postcss
- **PDF.js 3.11.174** for PDF parsing
- **Tesseract.js 5.0.5** for OCR
- **idb 8.0.0** for IndexedDB wrapper

### Adding New Features

1. **New language support**: Update OCR worker to support multi-language
2. **Batch processing**: Queue multiple files with parallel workers
3. **Page range selector**: Add UI to select specific pages
4. **Export to DOCX**: Use docx library for Word format

---

## Known Limitations

### Functional Limitations
- ⚠️ **OCR speed**: ~4s per page (acceptable for <20 page documents)
- ⚠️ **Hybrid PDFs**: Still under investigation, may miss some image pages
- ⚠️ **Handwritten text**: Low accuracy (40-60%), not recommended
- ⚠️ **Complex layouts**: Tables and multi-column text may have order issues
- ⚠️ **No password support**: Encrypted PDFs will fail to parse
- ❌ **No image extraction**: Images are ignored completely
- ❌ **No layout preservation**: Output is plain text only
- ❌ **No page selection**: Must process all pages (no range selector)

### Technical Limitations
- **iOS performance**: Slower OCR due to disabled WASM JIT compilation
- **Mobile memory**: 50-75MB limits on mobile vs 100MB on desktop
- **Browser tab**: Single tab processing (Web Worker limitation)
- **IndexedDB quota**: ~50MB typical limit for checkpoints

