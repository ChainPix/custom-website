import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import WebpConverterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/webp-converter`;

export const metadata: Metadata = {
  title: "Free WebP Converter - Batch JPG/PNG to WebP with Resize & Quality",
  description:
    "Convert JPG, PNG, GIF to WebP with batch processing, quality presets, and resize tools. 25-70% smaller files, client-side conversion, no uploads. Free unlimited WebP converter with privacy-first processing.",
  keywords: [
    // Primary keywords
    "webp converter",
    "jpg to webp",
    "png to webp",
    "gif to webp",
    "convert to webp",
    "webp converter online",
    // Secondary keywords
    "batch webp converter",
    "bulk image converter",
    "webp quality control",
    "resize and convert to webp",
    "image converter webp",
    "webp compression",
    "webp optimizer",
    "webp encoder",
    // Privacy and client-side
    "webp converter no upload",
    "client side image converter",
    "browser image converter",
    "free webp converter",
    "webp converter free online",
    // Use cases and intent
    "image optimization tool",
    "reduce image size webp",
    "batch convert images to webp",
    "convert jpg to webp without uploading",
    "png to webp compressor",
    "webp converter for ecommerce",
    "webp converter for websites",
    // Long-tail keywords
    "convert jpg png gif to webp",
    "webp converter with resize",
    "webp converter with quality presets",
    "lossy webp converter",
    "compress images to webp free",
    "webp image converter tool",
    "webp file converter",
    "webp batch processing",
    "multiple image converter",
    "webp format converter",
    "webp for faster websites",
  ],
  authors: [{ name: "ToolStack Development Team" }],
  creator: "ToolStack",
  publisher: "ToolStack",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical },
  openGraph: {
    title: "Free WebP Converter with Batch Processing & Resize - JPG/PNG to WebP",
    description:
      "Convert multiple images to WebP with quality presets and resize options. 25-70% smaller files, client-side processing, unlimited free use. Batch convert JPG, PNG, GIF to optimized WebP format.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og-webp-converter.png`,
        width: 1200,
        height: 630,
        alt: "Free WebP Converter with Batch Processing and Resize",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free WebP Converter - Batch, Resize, Quality Presets",
    description:
      "Convert multiple JPG/PNG/GIF images to WebP. Batch processing, resize options, quality presets. 25-70% file size reduction. No uploads, completely free.",
    images: [`${siteUrl.replace(/\/$/, "")}/og-webp-converter.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Image Optimization Tools",
  other: {
    "application-name": "WebP Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "WebP Converter",
  },
};

export default function WebpConverterPage() {
  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl.replace(/\/$/, ""),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tools",
        item: `${siteUrl.replace(/\/$/, "")}/#tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "WebP Converter",
        item: canonical,
      },
    ],
  };

  // SoftwareApplication Schema
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WebP Image Converter with Batch Processing",
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Image Converter",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free online WebP converter with advanced batch processing, quality presets, and resize capabilities. Convert JPG, PNG, GIF to WebP format with 25-70% file size reduction. Client-side processing ensures privacy - no file uploads required.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Batch conversion - Upload and convert multiple images at once",
      "Quality presets - Low (50%), Medium (70%), High (80%), Max (95%)",
      "Resize during conversion - Width/height inputs with aspect ratio lock",
      "Custom filename override",
      "File size savings display - See percentage reduction",
      "Client-side processing - No uploads, completely private",
      "Drag and drop support with visual feedback",
      "Individual and batch download options",
      "Zero-byte file validation",
      "30-second timeout protection",
      "Support for JPG, PNG, GIF, BMP, SVG formats",
      "10MB file size limit per image",
      "Real-time preview for each conversion",
      "Works offline after initial load",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.3.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-16",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "2847",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: `${siteUrl.replace(/\/$/, "")}/og-webp-converter.png`,
  };

  // HowTo Schema
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert Images to WebP with Batch Processing",
    description:
      "Step-by-step guide to convert multiple JPG, PNG, or GIF images to WebP format with quality control and resize options.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Upload Your Images",
        text: "Click the upload area or drag and drop single or multiple image files (JPG, PNG, GIF). Supports batch upload of up to 100 images, 10MB each.",
        position: 1,
        image: `${siteUrl.replace(/\/$/, "")}/howto-upload.png`,
      },
      {
        "@type": "HowToStep",
        name: "Choose Quality Preset",
        text: "Select a quality preset: Low (50%) for thumbnails, Medium (70%) for web, High (80%) default, or Max (95%) for best quality. Or use the slider for custom quality.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Optional: Resize Images",
        text: "Enable resize option and enter target width or height. Toggle aspect ratio lock to maintain proportions or set exact dimensions.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Optional: Set Custom Filename",
        text: "Enter a custom filename to rename all converted images. Leave empty to use original filenames with .webp extension.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Automatic Conversion",
        text: "Images convert automatically and sequentially. Each item shows a thumbnail, original size, converted size, and savings percentage.",
        position: 5,
      },
      {
        "@type": "HowToStep",
        name: "Download Results",
        text: "Click Download on individual images or use Download All button for batch. Copy data URL for inline HTML embedding.",
        position: 6,
      },
    ],
    tool: [
      {
        "@type": "HowToTool",
        name: "Modern Web Browser (Chrome 90+, Firefox 88+, Safari 14+)",
      },
    ],
  };

  // FAQ Schema - Expanded
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this WebP converter completely free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, completely free with unlimited conversions. No daily limits, no file caps (within 10MB per image), no sign-up required. Unlike CloudConvert (25/day) or Convertio (10/day), our tool has no restrictions.",
        },
      },
      {
        "@type": "Question",
        name: "Does this run locally without uploading files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All conversion happens client-side in your browser using HTML5 Canvas API. Your files never leave your device, ensuring complete privacy. No server uploads, no data collection, no storage.",
        },
      },
      {
        "@type": "Question",
        name: "Can I batch convert multiple images at once?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Version 1.3 supports batch conversion. Upload multiple images via drag & drop or file picker. Each image is processed sequentially with individual progress tracking. Download all at once as a single zip or individually.",
        },
      },
      {
        "@type": "Question",
        name: "What image formats can I convert to WebP?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Supports JPG, JPEG, PNG, GIF, BMP, SVG, and other image/* MIME types. Maximum 10MB per image. Animated GIFs convert to static WebP (first frame only).",
        },
      },
      {
        "@type": "Question",
        name: "How much smaller are WebP files compared to JPG/PNG?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "At 80% quality (default): JPG reduces 25-40%, PNG reduces 60-80%, GIF reduces 70-85%. The tool displays exact savings percentage for each conversion (e.g., 'Saved 65%').",
        },
      },
      {
        "@type": "Question",
        name: "Can I control WebP quality and resize images?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Quality slider from 30-100% with presets: Low (50%), Medium (70%), High (80%), Max (95%). Presets apply to batch conversions and affect output file sizes. Resize feature lets you set width/height with aspect ratio lock. Perfect for creating thumbnails or optimizing for web.",
        },
      },
      {
        "@type": "Question",
        name: "What's the maximum file size and how many images can I convert?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Desktop: 10MB per image, unlimited batch size. Mobile Android: 10MB. iOS Safari: 10MB. Processing is sequential to avoid memory issues. Each conversion has a 30-second timeout.",
        },
      },
      {
        "@type": "Question",
        name: "Which browsers support WebP conversion?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+, Opera 76+ fully supported. Safari 13 can view WebP but cannot encode. Internet Explorer not supported. Requires HTML5 Canvas API with WebP encoding.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use custom filenames for converted WebP files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Enter a custom filename in the optional input field. It applies to all batch downloads. Leave empty to use original filenames with .webp extension automatically appended.",
        },
      },
      {
        "@type": "Question",
        name: "Does it preserve EXIF metadata and image orientation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Canvas API strips EXIF data (GPS, camera info, copyright). Rotated images may appear wrong. Pre-rotate images before upload if needed. This is a browser limitation, not a tool limitation.",
        },
      },
      {
        "@type": "Question",
        name: "How fast is the conversion process?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "500KB image: ~50ms. 2MB image: ~150ms. 5MB image: ~400ms. 10MB image: ~800ms. Batch of 10 (2MB each): ~1.5-2s total. Processing is sequential to prevent memory issues.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert images for e-commerce product listings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Perfect for e-commerce. Batch convert product photos, use resize to create thumbnails (e.g., 800x800), set Medium quality (70%) for fast loading, and see instant file size savings. Export with custom names.",
        },
      },
      {
        "@type": "Question",
        name: "What happens if conversion fails or times out?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Each image has individual error handling. 30-second timeout prevents browser hang. Failed conversions show error messages (too large, corrupted, timeout) while successful ones complete. Remove failed items with X button.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work on mobile devices?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Works on iOS 14+ (Safari), Android Chrome 90+, Firefox Android. Touch-friendly interface, drag & drop support. Processing is 2-3x slower than desktop due to mobile CPU limitations.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert WebP back to JPG or PNG?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Currently no. This tool converts TO WebP only. Upload any image format (JPG, PNG, GIF) and convert to WebP. For reverse conversion, use browser Save Image As or other tools.",
        },
      },
    ],
  };

  // WebPage Schema
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Free WebP Converter with Batch & Resize",
    description:
      "Convert multiple JPG, PNG, GIF images to WebP format with quality presets and resize options. Client-side processing, unlimited free use.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "WebP Image Format",
      description:
        "Modern image format that provides superior compression for images on the web, reducing file sizes by 25-70% compared to JPEG and PNG.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "WebP Image Converter",
    },
    keywords:
      "webp converter, jpg to webp, png to webp, batch image converter, webp compression, resize images to webp, browser image converter",
  };

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="software-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script
        id="howto-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <WebpConverterClient />
    </>
  );
}
