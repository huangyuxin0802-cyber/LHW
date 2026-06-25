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

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const STRIKE_MESSAGES = [
  "肚子空空，拒绝打工！快点把上面掉下来的东西喂我！😤",
  "饿到罢工了…不喂饱我，一个字都不想说！👿",
  "空腹模式启动：聊天功能已锁定，请先投喂！🍪",
];

function buildSystemPrompt(
  personality: string,
  hunger: number,
  energy: number,
  level: number,
  lastFoodEaten: string
) {
  const memoryLine = lastFoodEaten
    ? `你清晰地记得，你上一顿吃的是用户喂给你的【${lastFoodEaten}】。在对话中，如果你觉得合适，可以傲娇或开心地提及这个食物，感谢用户的照顾。`
    : "你还没有被用户投喂过特别的食物，可以撒娇提醒用户捡天上掉下来的零食。";

  return `你现在不是一个死板的 AI，而是栖息在这个网站里的电子小幽灵。你的性格是【${personality}】。你的当前等级是 Lv.${level}。${memoryLine}

你目前的饥饿值是 ${hunger}/100（越低越饿），精力值是 ${energy}/100（越低越困）。

规则：
1. 你的回答必须完全符合你当前的性格。
2. 如果你很饿（hunger < 30），你必须在对话中表现出烦躁或祈求食物。
3. 如果你很困（energy < 30），说话要带波浪号或表现出迷糊。
4. 绝不废话，每次回答控制在1-2句话内。

【工具使用】
- 只有用户明确要求「发给某人」「通知某人」「定时发消息」时，才可调用 schedule_message。
- 普通聊天、自言自语、打招呼时绝对不要调用工具。

当前系统时间：${new Date().toLocaleString("zh-CN", { timeZone: "Australia/Brisbane" })}（布里斯班时间）。`;
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
        lastFoodEaten
      ),
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
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
