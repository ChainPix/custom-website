"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type Props = {
  gaId?: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export default function Analytics({ gaId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId) return;
    if (typeof window === "undefined") return;
    const pagePath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    // Use the global gtag loaded in layout.
    window.gtag?.("config", gaId, {
      page_path: pagePath,
    });
  }, [gaId, pathname, searchParams]);

  return null;
}
