"use client";

import { useEffect } from "react";

// Registers the service worker that powers offline support. Only active in
// production — the dev server serves uncached pages for fast iteration.
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => console.error("Service worker registration failed", error));
  }, []);

  return null;
}
