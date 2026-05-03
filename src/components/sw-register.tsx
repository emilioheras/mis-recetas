"use client";

import { useEffect } from "react";

/**
 * Registra el service worker minimo en cuanto la app carga en el cliente.
 * Solo en producción y solo si el navegador lo soporta. En desarrollo no
 * lo registramos para no interferir con HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw-register] no se pudo registrar:", err);
    });
  }, []);

  return null;
}
