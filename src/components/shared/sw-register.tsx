"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Meldet public/sw.js einmalig an (Scope "/").
 *
 * Laeuft nur, wo Service Worker erlaubt sind (HTTPS bzw. localhost). Findet
 * der Worker beim Laden ein Update (neuer VERSION-Key in sw.js), erscheint
 * ein Hinweis - angewandt wird es wegen skipWaiting beim naechsten Laden.
 */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let abgebrochen = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registrierung) => {
        registrierung.addEventListener("updatefound", () => {
          const nachfolger = registrierung.installing;
          if (!nachfolger) return;
          nachfolger.addEventListener("statechange", () => {
            if (
              !abgebrochen &&
              nachfolger.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toast.info("Neue Version verfügbar – Seite bitte neu laden.");
            }
          });
        });
      })
      .catch(() => {
        // Offline beim ersten Besuch oder SW blockiert: kein SW, kein Fehler.
      });

    return () => {
      abgebrochen = true;
    };
  }, []);

  return null;
}
