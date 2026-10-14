"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* non-fatal */
      });
    }
  }, []);
  return null;
}