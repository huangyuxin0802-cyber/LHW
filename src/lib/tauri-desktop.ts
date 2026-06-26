"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  primaryMonitor,
} from "@tauri-apps/api/window";

export const ORB_WINDOW = { width: 128, height: 128 } as const;
export const PANEL_WINDOW = { width: 420, height: 640 } as const;
const ORB_MARGIN = 20;

const ORB_BG: [number, number, number, number] = [0, 0, 0, 0];
const TRANSPARENT_BG: [number, number, number, number] = [0, 0, 0, 0];

function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  );
}

export function useIsTauri() {
  const [isTauri, setIsTauri] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const runtime = isTauriRuntime();
    setIsTauri(runtime);
    setReady(true);
  }, []);

  return { isTauri, ready };
}

/** Must run synchronously inside pointerdown — no dynamic import. */
export function startTauriWindowDrag() {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    void getCurrentWindow().startDragging();
  } catch (error) {
    console.error("[tauri] startDragging failed:", error);
  }
}

function setDesktopPetAppearance(mode: "orb" | "panel") {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.remove("desktop-pet-orb", "desktop-pet-panel");
  document.documentElement.classList.add(
    mode === "orb" ? "desktop-pet-orb" : "desktop-pet-panel"
  );
  document.body.classList.toggle("desktop-pet-body", mode === "orb");
}

async function setWindowBackground(mode: "orb" | "panel") {
  const win = getCurrentWindow();
  await win.setBackgroundColor(mode === "panel" ? TRANSPARENT_BG : ORB_BG);
}

async function applyWindowShape(mode: "orb" | "panel") {
  try {
    await invoke("set_desktop_window_shape", { mode });
  } catch (error) {
    console.error(`[tauri] set_desktop_window_shape(${mode}) failed:`, error);
  }
}

async function applyOrbWindowShape() {
  await new Promise((resolve) => window.setTimeout(resolve, 32));
  await applyWindowShape("orb");
}

async function applyPanelWindowShape() {
  await new Promise((resolve) => window.setTimeout(resolve, 32));
  await applyWindowShape("panel");
}

async function getLogicalWindowPosition() {
  const win = getCurrentWindow();
  const [position, scaleFactor] = await Promise.all([
    win.outerPosition(),
    win.scaleFactor(),
  ]);

  return position.toLogical(scaleFactor);
}

async function clampToWorkArea(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const monitor = await primaryMonitor();

  if (!monitor) {
    return { x, y };
  }

  const workArea = monitor.workArea;
  const maxX = workArea.position.x + workArea.size.width - width;
  const maxY = workArea.position.y + workArea.size.height - height;

  return {
    x: Math.max(workArea.position.x, Math.min(x, maxX)),
    y: Math.max(workArea.position.y, Math.min(y, maxY)),
  };
}

async function placeOrbBottomRight() {
  const monitor = await primaryMonitor();

  if (!monitor) {
    return;
  }

  const workArea = monitor.workArea;
  const x = workArea.position.x + workArea.size.width - ORB_WINDOW.width - ORB_MARGIN;
  const y = workArea.position.y + workArea.size.height - ORB_WINDOW.height - ORB_MARGIN;

  await getCurrentWindow().setPosition(new LogicalPosition(x, y));
}

type DesktopPetOrbModeOptions = {
  /** Keep the window top-left where it is (collapse from panel). */
  preservePosition?: boolean;
};

export async function setDesktopPetOrbMode(options?: DesktopPetOrbModeOptions) {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const win = getCurrentWindow();
    const preservePosition = options?.preservePosition ?? false;
    const anchor = preservePosition ? await getLogicalWindowPosition() : null;

    setDesktopPetAppearance("orb");
    await win.setResizable(false);
    await win.setSize(new LogicalSize(ORB_WINDOW.width, ORB_WINDOW.height));

    if (anchor) {
      const next = await clampToWorkArea(
        anchor.x,
        anchor.y,
        ORB_WINDOW.width,
        ORB_WINDOW.height
      );
      await win.setPosition(new LogicalPosition(next.x, next.y));
    } else {
      await placeOrbBottomRight();
    }

    await win.setAlwaysOnTop(true);
    await setWindowBackground("orb");
    await applyOrbWindowShape();
  } catch (error) {
    console.error("[tauri] setDesktopPetOrbMode failed:", error);
  }
}

export async function setDesktopPetPanelMode() {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const win = getCurrentWindow();
    const anchor = await getLogicalWindowPosition();

    setDesktopPetAppearance("panel");
    await win.setResizable(true);
    await win.setSize(new LogicalSize(PANEL_WINDOW.width, PANEL_WINDOW.height));
    await win.setAlwaysOnTop(true);

    const next = await clampToWorkArea(
      anchor.x,
      anchor.y,
      PANEL_WINDOW.width,
      PANEL_WINDOW.height
    );
    await win.setPosition(new LogicalPosition(next.x, next.y));
    await setWindowBackground("panel");
    await applyPanelWindowShape();
  } catch (error) {
    console.error("[tauri] setDesktopPetPanelMode failed:", error);
  }
}
