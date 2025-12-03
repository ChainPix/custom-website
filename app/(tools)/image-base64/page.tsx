import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ImageBase64Client from "./client";

export const metadata: Metadata = {
  title: "Image to Base64 | FastFormat Tools",
  description:
    "Convert images to Base64 strings in your browser. Drag/drop an image and copy the encoded output.",
  keywords: [
    "image to base64",
    "png to base64",
    "jpg to base64",
    "convert image",
    "base64 encoder",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/image-base64`,
  },
  openGraph: {
    title: "Image to Base64 | FastFormat Tools",
    description: "Upload an image and get a Base64 string instantly. Runs locally in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/image-base64`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Image to Base64 | FastFormat Tools",
    description: "Drag/drop an image to convert it to Base64 with copy-ready output.",
  },
};

export default function ImageBase64Page() {
  return <ImageBase64Client />;
}
