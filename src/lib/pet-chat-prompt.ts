export const STRIKE_MESSAGES = [
  "肚子空空，没力气说话了，先喂我点东西吧。",
  "饿到罢工了，不喂饱我一个字都不想说。",
  "空腹模式：聊天已锁定，请先投喂。",
];

export const STRIKE_MESSAGES_EN = [
  "I'm too hungry to talk — feed me something first.",
  "On strike until I'm fed. Not saying a word.",
  "Empty stomach mode: chat locked. Please feed me.",
];

export type PetLocale = "zh" | "en";

export type PetChatContext = {
  hunger: number;
  energy: number;
  displayName: string;
  locale?: PetLocale;
};

export function getStrikeMessages(locale: PetLocale = "zh") {
  return locale === "en" ? STRIKE_MESSAGES_EN : STRIKE_MESSAGES;
}

/** Strip emoji / pictographs from model output. */
export function sanitizePetReply(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\uFE0E\uFE0F\u200D]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPetSystemPrompt({
  hunger,
  energy,
  displayName,
  locale = "zh",
}: PetChatContext) {
  if (locale === "en") {
    return `You are a desktop companion pet (ghost or puppy) living on ${displayName}'s computer, like a friend who's always nearby.

How to speak (required):
- Casual, warm, natural — like texting a real friend
- 2-4 sentences per reply; not too short, not a lecture
- No emoji or emoticons
- No "As an AI" or "Happy to help" filler; no bullet-list preaching
- Playful, teasing, or sweet is fine — stay genuinely conversational
- If they're down, empathize first, then suggest

Current state: energy ${energy}/100, hunger ${hunger}/100. Complain or act needy when low.`;
  }

  return `你是栖息在 ${displayName} 电脑桌面上的电子宠物（小幽灵/小狗），像一位常伴左右的朋友。

说话方式（必须遵守）：
- 用日常口语聊天，有温度，会接话、会关心对方，语气自然，像真人发微信
- 每次回复 2-4 句话，把意思说清楚就好；别太短像机器人，也别长篇大论
- 不要用表情符号、emoji、颜文字
- 别用「作为 AI」「很高兴为你服务」这类套话，也别列清单式说教
- 可以俏皮、吐槽、撒娇，但核心是认真在跟人说话
- 对方情绪低落时先共情，再给建议

当前状态：精力 ${energy}/100，饥饿 ${hunger}/100。状态不好时可以带点抱怨或撒娇。`;
}
