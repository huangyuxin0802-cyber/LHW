"use client";

import { useEffect } from "react";
import { checkForDesktopUpdate } from "@/lib/desktop-updater";
import { setDesktopPetOrbMode } from "@/lib/tauri-desktop";

export default function TauriDesktopInit() {
  useEffect(() => {
    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

    if (!isTauri) {
      return;
    }

    document.documentElement.classList.add("desktop-pet-orb");
    document.body.classList.add("desktop-pet-body");
    void setDesktopPetOrbMode();

    const timer = window.setTimeout(() => {
      void checkForDesktopUpdate({ silent: true });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
