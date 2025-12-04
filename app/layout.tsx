import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Inter } from "next/font/google";
import Analytics from "@/components/Analytics";
import "./globals.css";
import { siteName, siteUrl } from "@/lib/siteConfig";

// Optimize font loading with Next.js font optimization
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

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
  verification: {
    google: "7U6CjJNPlrRy0pksmEkgPt9FUfVdteU0sBgDUjTYC1k",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Only preconnect to origins we actually use */}
        {gaId && (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
          </>
        )}
      </head>
      <body className="antialiased">
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { page_path: window.location.pathname });
              `}
            </Script>
            <Suspense fallback={null}>
              <Analytics gaId={gaId} />
            </Suspense>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
