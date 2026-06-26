import type { Update } from "@tauri-apps/plugin-updater";

export type DesktopUpdateState =
  | "idle"
  | "checking"
  | "upToDate"
  | "available"
  | "downloading"
  | "error";

export type DesktopUpdateSnapshot = {
  state: DesktopUpdateState;
  version?: string;
  notes?: string;
  progress?: number;
  error?: string;
};

let pendingUpdate: Update | null = null;
let snapshot: DesktopUpdateSnapshot = { state: "idle" };
const listeners = new Set<(next: DesktopUpdateSnapshot) => void>();

function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  );
}

function notify() {
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function setSnapshot(next: DesktopUpdateSnapshot) {
  snapshot = next;
  notify();
}

export function getDesktopUpdateSnapshot() {
  return snapshot;
}

export function subscribeDesktopUpdate(
  listener: (next: DesktopUpdateSnapshot) => void
) {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export async function checkForDesktopUpdate(options?: { silent?: boolean }) {
  if (!isTauriRuntime()) {
    return snapshot;
  }

  if (snapshot.state === "checking" || snapshot.state === "downloading") {
    return snapshot;
  }

  setSnapshot({ state: "checking" });

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update) {
      pendingUpdate = update;
      setSnapshot({
        state: "available",
        version: update.version,
        notes: update.body ?? undefined,
      });
      return snapshot;
    }

    pendingUpdate = null;
    setSnapshot({ state: "upToDate" });
    return snapshot;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Update check failed";

    if (options?.silent) {
      setSnapshot({ state: "idle", error: message });
    } else {
      setSnapshot({ state: "error", error: message });
    }

    return snapshot;
  }
}

export async function installDesktopUpdate() {
  if (!pendingUpdate) {
    throw new Error("No pending update");
  }

  const update = pendingUpdate;
  setSnapshot({
    state: "downloading",
    version: update.version,
    notes: update.body ?? undefined,
    progress: 0,
  });

  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      contentLength = event.data.contentLength ?? 0;
      setSnapshot({
        state: "downloading",
        version: update.version,
        notes: update.body ?? undefined,
        progress: 0,
      });
      return;
    }

    if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      const progress =
        contentLength > 0
          ? Math.min(100, Math.round((downloaded / contentLength) * 100))
          : undefined;
      setSnapshot({
        state: "downloading",
        version: update.version,
        notes: update.body ?? undefined,
        progress,
      });
      return;
    }

    if (event.event === "Finished") {
      setSnapshot({
        state: "downloading",
        version: update.version,
        progress: 100,
      });
    }
  });

  pendingUpdate = null;
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
