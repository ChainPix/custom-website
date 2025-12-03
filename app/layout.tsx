import type { Metadata } from "next";
import "./globals.css";
import { siteName, siteUrl } from "@/lib/siteConfig";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | JSON Formatter, Resume Analyzer, PDF to Text`,
    template: `%s | ${siteName}`,
  },
  description:
    "FastFormat delivers free, instant developer utilities: online JSON formatter, resume analyzer, and PDF to text converter built for speed, clarity, and SEO-friendly performance.",
  keywords: [
    "json formatter online",
    "free json beautifier",
    "resume analyzer",
    "resume keyword check",
    "pdf to text free",
    "developer tools",
    "online utilities",
    "seo friendly tools",
    "fast text converter",
    "code formatting",
  ],
  openGraph: {
    title: `${siteName} | JSON Formatter, Resume Analyzer, PDF to Text`,
    description:
      "Free online JSON formatter, resume analyzer, and PDF to text tools built for speed, clarity, and trust. No sign-up, just instant results.",
    url: "/",
    siteName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — fast, clear online tools`,
    description:
      "Run a JSON formatter, resume analyzer, and PDF to text converter with zero friction. Built for developers and recruiters.",
  },
  alternates: {
    canonical: "/",
  },
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
  applicationName: siteName,
  category: "technology",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
