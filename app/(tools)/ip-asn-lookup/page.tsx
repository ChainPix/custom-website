import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import IpAsnClient from "./client";

export const metadata: Metadata = {
  title: "IP / ASN Lookup | ToolStack",
  description:
    "Parse IP addresses, detect IPv4/IPv6 and private ranges, and optionally fetch ASN details when a token is provided.",
  keywords: [
    "ip lookup",
    "asn lookup",
    "ipv4 checker",
    "ipv6 checker",
    "private ip",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
  },
  openGraph: {
    title: "IP / ASN Lookup | ToolStack",
    description: "Validate IPs, detect private ranges, and fetch ASN info if configured.",
    url: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IP / ASN Lookup | ToolStack",
    description: "Check IP version/private status; optional ASN lookup via token.",
  },
};

export default function IpAsnPage() {
  return <IpAsnClient />;
}
