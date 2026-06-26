export { APP_BUILT_AT, APP_VERSION } from "@/lib/app-version.generated";

export function formatBuiltAt(iso: string, locale: "zh" | "en" = "zh") {
  if (!iso) {
    return locale === "en" ? "Unknown" : "未知";
  }

  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-AU" : "zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
