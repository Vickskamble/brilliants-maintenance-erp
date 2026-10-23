"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.protocol !== "https:") return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    const reloadedKey = "bem-sw-reloaded";

    const onControllerChange = () => {
      // first visit (no previous worker) — nothing to upgrade to, don't reload
      if (!hadController) return;
      // loop guard: reload at most once per tab session
      if (sessionStorage.getItem(reloadedKey)) return;
      sessionStorage.setItem(reloadedKey, "1");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal */
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
