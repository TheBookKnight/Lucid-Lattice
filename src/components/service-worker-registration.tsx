"use client";

import { useEffect } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register(BASE_PATH + "/sw.js").catch(() => undefined);
  }, []);

  return null;
}
