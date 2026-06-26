import {
  buildPetSystemPrompt,
  sanitizePetReply,
  type PetChatContext,
} from "@/lib/pet-chat-prompt";

const STANDBY_INBOX_KEY = "ghost_pet_standby_inbox";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_UNREAD = 3;

export type StandbyInboxMessage = {
  id: string;
  content: string;
  createdAt: number;
  read: boolean;
};

export type StandbyMessageContext = PetChatContext & {
  hour: number;
};

function createId() {
  return crypto.randomUUID();
}

function loadInbox(): StandbyInboxMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STANDBY_INBOX_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is StandbyInboxMessage =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as StandbyInboxMessage).id === "string" &&
        typeof (item as StandbyInboxMessage).content === "string" &&
        typeof (item as StandbyInboxMessage).createdAt === "number" &&
        typeof (item as StandbyInboxMessage).read === "boolean"
    );
  } catch {
    return [];
  }
}

function saveInbox(messages: StandbyInboxMessage[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STANDBY_INBOX_KEY, JSON.stringify(messages));
}

export function hasUnreadStandby(): boolean {
  return loadInbox().some((message) => !message.read);
}

export function getUnreadStandbyMessages(): StandbyInboxMessage[] {
  return loadInbox().filter((message) => !message.read);
}

export function addStandbyMessage(content: string): StandbyInboxMessage {
  const trimmed = content.trim();
  const entry: StandbyInboxMessage = {
    id: createId(),
    content: trimmed,
    createdAt: Date.now(),
    read: false,
  };

  const inbox = loadInbox();
  inbox.push(entry);
  saveInbox(inbox.slice(-12));
  return entry;
}

export function markStandbyInboxRead() {
  const inbox = loadInbox().map((message) =>
    message.read ? message : { ...message, read: true }
  );
  saveInbox(inbox);
}

export function clearStandbyInbox() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STANDBY_INBOX_KEY);
}

export function canReceiveMoreStandby(): boolean {
  return getUnreadStandbyMessages().length < MAX_UNREAD;
}

export function consumeUnreadForChat(): Array<{
  id: string;
  role: "assistant";
  content: string;
}> {
  const unread = getUnreadStandbyMessages();
  if (unread.length === 0) {
    return [];
  }

  markStandbyInboxRead();

  return unread.map((message) => ({
    id: message.id,
    role: "assistant" as const,
    content: message.content,
  }));
}

function buildStandbyPrompt({ displayName, hunger, energy, hour }: StandbyMessageContext) {
  const timeHint =
    hour < 6
      ? "深夜"
      : hour < 11
        ? "上午"
        : hour < 14
          ? "中午"
          : hour < 18
            ? "下午"
            : hour < 22
              ? "晚上"
              : "夜里";

  return `${buildPetSystemPrompt({ displayName, hunger, energy })}

你现在在待机状态，想主动给用户发一条消息引起他注意。
要求：像朋友突然发来的一句关心或闲聊，2-3 句口语化中文，自然真诚，不要 emoji，不要标题腔。
当前时段：${timeHint}（${hour} 点）。只输出消息正文。`;
}

const TEMPLATE_MESSAGES: Array<(ctx: StandbyMessageContext) => string> = [
  ({ displayName, hour }) =>
    hour < 11
      ? `${displayName}，早上好。昨晚休息得还好吗？`
      : `${displayName}，这会儿忙不忙？记得喝口水。`,
  ({ displayName }) =>
    `我刚在桌面上晃了一圈，${displayName} 你今天心情怎么样？`,
  ({ hunger, displayName }) =>
    hunger < 45
      ? `${displayName}，我有点饿了。你要是方便，待会记得喂我一下。`
      : `${displayName}，我状态还不错，就是有点想听你说话。`,
  ({ energy, displayName }) =>
    energy < 45
      ? `我有点犯困，${displayName}。你要是累了也歇一会儿。`
      : `${displayName}，别一直盯着屏幕，起来走两步会舒服很多。`,
  ({ displayName }) =>
    `${displayName}，我刚刚想到你，过来跟你说一声。`,
  ({ hour, displayName }) =>
    hour >= 22
      ? `${displayName}，时间不早了。忙完就早点休息。`
      : `${displayName}，要是手头卡住了，你可以跟我说说。`,
];

export function pickStandbyTemplate(context: StandbyMessageContext): string {
  const pool = TEMPLATE_MESSAGES.map((fn) => fn(context));
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generateStandbyMessage(
  context: StandbyMessageContext
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim();

  if (!apiKey) {
    return pickStandbyTemplate(context);
  }

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: buildStandbyPrompt(context) },
          {
            role: "user",
            content: "请发一条待机主动消息给用户。",
          },
        ],
        temperature: 0.72,
        max_tokens: 160,
      }),
    });

    if (!response.ok) {
      return pickStandbyTemplate(context);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return pickStandbyTemplate(context);
    }

    const cleaned = sanitizePetReply(text);
    return cleaned || pickStandbyTemplate(context);
  } catch {
    return pickStandbyTemplate(context);
  }
}

export function randomStandbyDelayMs(first = false) {
  const min = first ? 50_000 : 4 * 60_000;
  const max = first ? 110_000 : 8 * 60_000;
  return min + Math.floor(Math.random() * (max - min));
}
