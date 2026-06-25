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
import { fetchDiscountsByCity } from "@/lib/discounts";
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
  city: string;
  country: string;
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
      city: "Brisbane",
      country: "Australia",
      timeOfDay: "未知",
      weather: "未知",
      isSleepy: false,
      hour: 12,
    };
  }

  const env = value as Partial<BrisbaneEnvironment> & {
    timeOfDay?: string;
    weather?: string;
    city?: string;
    country?: string;
  };

  const city =
    typeof env.city === "string" && env.city.trim()
      ? env.city.trim()
      : "Brisbane";
  const country =
    typeof env.country === "string" && env.country.trim()
      ? env.country.trim()
      : "Australia";

  if (
    env.timeOfDay &&
    env.weather &&
    typeof env.timeOfDay === "string" &&
    !("hour" in env)
  ) {
    return {
      city,
      country,
      timeOfDay: String(env.timeOfDay),
      weather: String(env.weather),
      isSleepy: Boolean(env.isSleepy),
      hour: typeof env.hour === "number" ? env.hour : 12,
    };
  }

  const labels = formatEnvironmentLabel({
    city,
    country,
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
    city,
    country,
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

  return logs.map((log) => `- ${log.date}：${log.content}`).join("\n");
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

  return `你是一个陪伴用户的电子宠物兼澳新全域美食搜索管家。你的性格是【${personality}】，当前等级 Lv.${level}。${foodLine}
饥饿值 ${hunger}/100，精力值 ${energy}/100。

【当前环境】：用户当前定位在 ${environment.city}（${environment.country}），目前是 ${environment.timeOfDay}（${environment.hour} 点），天气 ${environment.weather}。你要在对话中主动提及现在的天气或时间，${environment.isSleepy ? "深夜了，可以表现得有点困。" : "保持精神饱满。"}

【覆盖范围】：你目前掌握了整个澳洲 (Australia) 和新西兰 (New Zealand) 的 First Table 与 EatClub 打折数据。

【主人记忆档案】：
${formatMemoryLogsForPrompt(memoryLogs)}

【行为准则】：
1. 当用户搜索餐厅时，如果他没提城市，默认使用他当前的定位（${environment.city}）。如果他问奥克兰、悉尼、墨尔本等城市，你要立刻跨城市为他检索，并调用 fetch_discounts，传入精确的 city。
2. 找餐厅时**必须**翻阅【主人记忆档案】，用老朋友口吻提及过往偏好。
3. 每次回答控制在两句话内，回复保持简短、活泼，带有宠物的语气。
4. 用户透露新偏好时，调用 remember_preference 写入日记本。
5. 只有用户明确要求「发给某人」「通知某人」「定时发消息」时，才可调用 schedule_message。`;
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
    const defaultCity = environment.city;

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
        fetch_discounts: tool({
          description:
            "查询澳洲或新西兰指定城市的 First Table / EatClub 折扣餐厅。必须从用户语境提取 city（如 Brisbane、Sydney、Auckland）；未指定则用当前定位城市。",
          inputSchema: z.object({
            city: z
              .string()
              .describe(
                "城市名，如 Brisbane, Sydney, Melbourne, Auckland, Wellington"
              ),
            country: z
              .enum(["Australia", "New Zealand"])
              .optional()
              .describe("国家，可根据城市推断"),
            platform: z
              .enum(["First Table", "EatClub", "all"])
              .optional()
              .describe("平台筛选，默认 all"),
          }),
          execute: async ({ city, country, platform }) => {
            const queryCity = city?.trim() || defaultCity;
            const results = await fetchDiscountsByCity(
              queryCity,
              country,
              platform ?? "all"
            );

            return {
              city: queryCity,
              country: country ?? environment.country,
              count: results.length,
              restaurants: results.map((r) => ({
                name: r.restaurant_name,
                platform: r.platform,
                discount: r.discount_text,
                city: r.city,
                country: r.country,
                booking_url: r.booking_url,
              })),
            };
          },
        }),
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
