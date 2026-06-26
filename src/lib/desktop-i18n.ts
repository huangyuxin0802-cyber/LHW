export type DesktopLocale = "zh" | "en";

export const DESKTOP_LOCALE_KEY = "desktop-pet-locale";

const STRINGS = {
  zh: {
    appTitle: "桌面宠物",
    ghostPet: "调皮幽灵",
    puppyPet: "治愈小狗",
    collapse: "收起到悬浮球",
    clearChat: "清空对话",
    settings: "设置",
    language: "语言",
    chinese: "中文",
    english: "English",
    loginDays: (days: number) => `累计登录 ${days} 天`,
    chatWelcome: "对话已开始，和桌面上的小幽灵聊聊天吧",
    thinking: "小幽灵正在想怎么回你…",
    send: "发送",
    sending: "思考中…",
    inputPlaceholder: "和你的桌面宠物说点什么…",
    strikePlaceholder: "宠物罢工中…先喂它掉下来的零食吧",
    companionHint: "桌面陪伴",
    clearNotice: (name: string) => `记忆已清空，${name} 我们重新认识一下吧！`,
    settingsTitle: "设置",
    close: "关闭",
    version: "版本",
    builtAt: "构建时间",
    upToDate: "已是最新版本",
    checkUpdate: "检查更新",
    checkingUpdate: "正在检查更新…",
    updateAvailable: (version: string) => `发现新版本 v${version}`,
    installUpdate: "立即更新",
    downloadingUpdate: "正在下载更新…",
    updateError: "检查更新失败",
    updateNotes: "更新说明",
  },
  en: {
    appTitle: "Desktop Pet",
    ghostPet: "Playful Ghost",
    puppyPet: "Healing Puppy",
    collapse: "Minimize to orb",
    clearChat: "Clear chat",
    settings: "Settings",
    language: "Language",
    chinese: "中文",
    english: "English",
    loginDays: (days: number) => `${days} days logged in`,
    chatWelcome: "Chat started — say hi to your desktop ghost",
    thinking: "Your ghost is thinking…",
    send: "Send",
    sending: "Thinking…",
    inputPlaceholder: "Say something to your desktop pet…",
    strikePlaceholder: "On strike — feed the snacks first",
    companionHint: "Desktop companion",
    clearNotice: (name: string) => `Memory cleared. Fresh start, ${name}!`,
    settingsTitle: "Settings",
    close: "Close",
    version: "Version",
    builtAt: "Built at",
    upToDate: "Up to date",
    checkUpdate: "Check for updates",
    checkingUpdate: "Checking for updates…",
    updateAvailable: (version: string) => `Update available: v${version}`,
    installUpdate: "Install update",
    downloadingUpdate: "Downloading update…",
    updateError: "Update check failed",
    updateNotes: "Release notes",
  },
} as const;

export function getDesktopStrings(locale: DesktopLocale) {
  return STRINGS[locale];
}

export function normalizeDesktopLocale(value: string | null | undefined): DesktopLocale {
  return value === "en" ? "en" : "zh";
}
