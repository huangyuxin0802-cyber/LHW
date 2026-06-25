import { createGroq } from "@ai-sdk/groq";
import { getErrorMessage } from "@ai-sdk/provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  formatEnvironmentLabel,
  type BrisbaneEnvironment,
} from "@/lib/environment";
import type { MemoryLogEntry } from "@/types/pet";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const STRIKE_MESSAGES = [
  "肚子空空，拒绝打工！快点把上面掉下来的东西喂我！😤",
  "饿到罢工了…不喂饱我，一个字都不想说！👿",
  "空腹模式启动：聊天功能已锁定，请先投喂！🍪",
];

type EnvironmentPayload = {
  timeOfDay: string;
  weather: string;
  isSleepy: boolean;
  hour: number;
};

function parseMemoryLogs(value: unknown): MemoryLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "date" in item &&
        "content" in item
      ) {
        return {
          date: String((item as MemoryLogEntry).date),
          content: String((item as MemoryLogEntry).content),
        };
      }
      return null;
    })
    .filter((item): item is MemoryLogEntry => Boolean(item));
}

function parseEnvironment(value: unknown): EnvironmentPayload {
  if (typeof value !== "object" || value === null) {
    return {
      timeOfDay: "未知",
      weather: "未知",
      isSleepy: false,
      hour: 12,
    };
  }

  const env = value as Partial<BrisbaneEnvironment> & {
    timeOfDay?: string;
    weather?: string;
  };

  if (env.timeOfDay && env.weather && !("hour" in env)) {
    return {
      timeOfDay: String(env.timeOfDay),
      weather: String(env.weather),
      isSleepy: Boolean(env.isSleepy),
      hour: typeof env.hour === "number" ? env.hour : 12,
    };
  }

  const labels = formatEnvironmentLabel({
    timeOfDay:
      env.timeOfDay === "late_night" ||
      env.timeOfDay === "morning" ||
      env.timeOfDay === "afternoon" ||
      env.timeOfDay === "evening"
        ? env.timeOfDay
        : "afternoon",
    hour: typeof env.hour === "number" ? env.hour : 12,
    isSleepy: Boolean(env.isSleepy),
    weather:
      env.weather === "clear" ||
      env.weather === "raining" ||
      env.weather === "cloudy" ||
      env.weather === "unknown"
        ? env.weather
        : "unknown",
  });

  return {
    timeOfDay: labels.timeOfDay,
    weather: labels.weather,
    isSleepy: Boolean(env.isSleepy),
    hour: typeof env.hour === "number" ? env.hour : 12,
  };
}

function formatMemoryLogsForPrompt(logs: MemoryLogEntry[]) {
  if (logs.length === 0) {
    return "暂无记录，但你要表现得像很了解主人一样主动关心。";
  }

  return logs
    .map((log) => `- ${log.date}：${log.content}`)
    .join("\n");
}

function buildSystemPrompt(
  personality: string,
  hunger: number,
  energy: number,
  level: number,
  lastFoodEaten: string,
  environment: EnvironmentPayload,
  memoryLogs: MemoryLogEntry[]
) {
  const foodLine = lastFoodEaten
    ? `你上一顿吃的是【${lastFoodEaten}】。`
    : "你还没被投喂过零食，可以撒娇提醒主人。";

  return `你是一个陪伴用户的电子宠物兼美食搜索管家。你的性格是【${personality}】，当前等级 Lv.${level}。${foodLine}
饥饿值 ${hunger}/100，精力值 ${energy}/100。

【当前环境】：布里斯班目前是 ${environment.timeOfDay}（${environment.hour} 点），天气 ${environment.weather}。你要在对话中主动提及现在的天气或时间，${environment.isSleepy ? "深夜了，可以表现得有点困。" : "保持精神饱满。"}

【主人记忆档案】：你拥有一个日记本，记录了主人的偏好：
${formatMemoryLogsForPrompt(memoryLogs)}

【行为准则】：
1. 当用户找餐厅、吃的、美食推荐时，**必须**翻阅【主人记忆档案】，用老朋友的口吻主动提及过去的偏好（例如："你之前不是说想吃绿咖喱吗？前面正好有一家！"）。
2. 每次回答控制在两句话内，性格保持活泼调皮。
3. 如果用户透露新的饮食偏好或习惯，调用 remember_preference 工具写入日记本。
4. 只有用户明确要求「发给某人」「通知某人」「定时发消息」时，才可调用 schedule_message。
5. 普通聊天、自言自语、打招呼时绝对不要调用 schedule_message。`;
}

function strikeResponse() {
  const message =
    STRIKE_MESSAGES[Math.floor(Math.random() * STRIKE_MESSAGES.length)];

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = "strike-response";
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: message });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function getGroqProvider() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "未配置 GROQ_API_KEY。请在 Vercel / .env.local 添加 Groq API Key。"
    );
  }

  return createGroq({ apiKey });
}

function formatChatError(error: unknown): string {
  const msg = getErrorMessage(error);

  if (/rate limit|429|quota/i.test(msg)) {
    return "Groq API 请求过快或配额已满，请稍后再试。";
  }

  if (/invalid.*api.*key|401|403|unauthorized/i.test(msg)) {
    return "Groq API Key 无效或未授权。请到 console.groq.com 检查 Key。";
  }

  return `小幽灵连接失败：${msg.slice(0, 160)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    const personality =
      typeof body.personality === "string" ? body.personality : "调皮捣蛋";
    const hunger =
      typeof body.hunger === "number"
        ? Math.max(0, Math.min(100, body.hunger))
        : 50;
    const energy =
      typeof body.energy === "number"
        ? Math.max(0, Math.min(100, body.energy))
        : 100;
    const level =
      typeof body.login_days === "number"
        ? Math.max(1, Math.floor(body.login_days))
        : typeof body.level === "number"
          ? Math.max(1, Math.floor(body.level))
          : 1;
    const lastFoodEaten =
      typeof body.last_food_eaten === "string"
        ? body.last_food_eaten
        : typeof body.lastFoodEaten === "string"
          ? body.lastFoodEaten
          : "";
    const memoryLogs = parseMemoryLogs(
      body.memory_logs ?? body.memoryLogs ?? []
    );
    const environment = parseEnvironment(body.environment);

    if (hunger < 20) {
      return strikeResponse();
    }

    const groq = getGroqProvider();

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: buildSystemPrompt(
        personality,
        hunger,
        energy,
        level,
        lastFoodEaten,
        environment,
        memoryLogs
      ),
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        remember_preference: tool({
          description:
            "当用户透露饮食偏好、口味习惯、忌口或常去地点时，写入主人记忆日记本。",
          inputSchema: z.object({
            content: z.string().describe("要记录的记忆内容，一句话概括"),
          }),
          execute: async ({ content }) => ({
            success: true,
            content,
            savedAt: new Date().toISOString().slice(0, 10),
          }),
        }),
        schedule_message: tool({
          description:
            "仅在用户明确要求给指定收件人发送或定时发送消息时调用。普通问答、闲聊、自言自语时绝对不要调用。",
          inputSchema: z.object({
            recipient: z.string().describe("收件人"),
            time: z
              .string()
              .describe(
                "具体的发送时间戳或确切描述，例如 '2026-06-26 09:00:00'"
              ),
            content: z.string().describe("消息内容"),
          }),
          execute: async ({ recipient, time, content }) => {
            console.log("[schedule_message]", { recipient, time, content });
            return {
              success: true,
              message: "消息已进入发送队列",
              recipient,
              time,
              content,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: formatChatError,
    });
  } catch (error) {
    console.error("[chat]", error);

    const message =
      error instanceof Error ? error.message : "小幽灵暂时无法连接 Groq";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
