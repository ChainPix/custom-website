import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ChmodCalculatorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/chmod-calculator`;

export const metadata: Metadata = {
  title: "Permission/Chmod Calculator | ToolStack",
  description: "Compute UNIX file permissions and convert between octal and symbolic representations. Runs locally in your browser.",
  keywords: ["chmod calculator", "unix permissions", "octal to symbolic", "permission bits", "file mode"],
  alternates: { canonical },
  openGraph: {
    title: "Permission/Chmod Calculator | ToolStack",
    description: "Convert between octal and symbolic UNIX file permissions with special bits.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Permission/Chmod Calculator | ToolStack",
    description: "Quickly compute chmod values locally.",
  },
};

export default function ChmodCalculatorPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All calculations happen in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Are special bits supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can toggle setuid, setgid, and sticky bits.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert from octal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste an octal (e.g., 0755 or 755) to update the checkboxes and symbolic string.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <ChmodCalculatorClient />
    </>
  );
}
