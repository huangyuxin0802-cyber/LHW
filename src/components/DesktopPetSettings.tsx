"use client";

import { useLocale } from "@/components/LocaleProvider";
import { APP_BUILT_AT, APP_VERSION, formatBuiltAt } from "@/lib/app-version";
import { getDesktopStrings, type DesktopLocale } from "@/lib/desktop-i18n";
import {
  checkForDesktopUpdate,
  getDesktopUpdateSnapshot,
  installDesktopUpdate,
  subscribeDesktopUpdate,
  type DesktopUpdateSnapshot,
} from "@/lib/desktop-updater";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type DesktopPetSettingsProps = {
  open: boolean;
  onClose: () => void;
};

function UpdateBadge({
  snapshot,
  locale,
}: {
  snapshot: DesktopUpdateSnapshot;
  locale: DesktopLocale;
}) {
  const t = getDesktopStrings(locale);

  if (snapshot.state === "checking") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300/70 bg-white/70 px-2 py-1 text-[11px] font-medium text-zinc-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t.checkingUpdate}
      </span>
    );
  }

  if (snapshot.state === "available") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50/95 px-2 py-1 text-[11px] font-medium text-amber-800">
        <Download className="h-3.5 w-3.5" />
        {t.updateAvailable(snapshot.version ?? "")}
      </span>
    );
  }

  if (snapshot.state === "downloading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/70 bg-violet-50/95 px-2 py-1 text-[11px] font-medium text-violet-800">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {snapshot.progress != null
          ? `${t.downloadingUpdate} ${snapshot.progress}%`
          : t.downloadingUpdate}
      </span>
    );
  }

  if (snapshot.state === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-300/70 bg-red-50/95 px-2 py-1 text-[11px] font-medium text-red-700">
        <AlertCircle className="h-3.5 w-3.5" />
        {t.updateError}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-50/90 px-2 py-1 text-[11px] font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {t.upToDate}
    </span>
  );
}

export default function DesktopPetSettings({
  open,
  onClose,
}: DesktopPetSettingsProps) {
  const { locale, setLocale } = useLocale();
  const t = getDesktopStrings(locale);
  const [updateSnapshot, setUpdateSnapshot] = useState<DesktopUpdateSnapshot>(
    getDesktopUpdateSnapshot()
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => subscribeDesktopUpdate(setUpdateSnapshot), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void checkForDesktopUpdate();
  }, [open]);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    try {
      await installDesktopUpdate();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Install update failed";
      setUpdateSnapshot({
        state: "error",
        error: message,
      });
      setInstalling(false);
    }
  }, []);

  const showInstallButton =
    updateSnapshot.state === "available" && !installing;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label={t.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="tauri-no-drag absolute inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="tauri-no-drag absolute left-3 right-3 top-14 z-50 max-h-[calc(100%-4rem)] overflow-y-auto rounded-2xl border border-white/55 bg-white/72 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                {t.settingsTitle}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/60 hover:text-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-white/60 bg-white/45 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-zinc-600">
                    {t.version}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-zinc-900">
                    v{APP_VERSION}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {t.builtAt}: {formatBuiltAt(APP_BUILT_AT, locale)}
                  </p>
                </div>
                <UpdateBadge snapshot={updateSnapshot} locale={locale} />
              </div>

              {updateSnapshot.notes && updateSnapshot.state === "available" && (
                <p className="mt-3 rounded-lg bg-white/55 px-2.5 py-2 text-[12px] leading-relaxed text-zinc-600">
                  <span className="font-medium text-zinc-700">
                    {t.updateNotes}:{" "}
                  </span>
                  {updateSnapshot.notes}
                </p>
              )}

              {updateSnapshot.state === "error" && updateSnapshot.error && (
                <p className="mt-3 text-[11px] leading-relaxed text-red-600">
                  {updateSnapshot.error}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void checkForDesktopUpdate()}
                  disabled={
                    updateSnapshot.state === "checking" ||
                    updateSnapshot.state === "downloading" ||
                    installing
                  }
                  className="rounded-xl border border-white/70 bg-white/55 px-3 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-white/80 disabled:opacity-50"
                >
                  {t.checkUpdate}
                </button>
                {showInstallButton && (
                  <button
                    type="button"
                    onClick={() => void handleInstall()}
                    className="rounded-xl border border-violet-400/60 bg-violet-600/90 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-500/90"
                  >
                    {t.installUpdate}
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-medium text-zinc-600">
                {t.language}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "zh" as DesktopLocale, label: t.chinese },
                    { id: "en" as DesktopLocale, label: t.english },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLocale(option.id)}
                    className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition ${
                      locale === option.id
                        ? "border-violet-400/60 bg-violet-500/15 text-violet-800"
                        : "border-white/60 bg-white/40 text-zinc-700 hover:bg-white/55"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
