import { createGroq } from "@ai-sdk/groq";
import { getErrorMessage } from "@ai-sdk/provider";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `你是一个栖息在网站里的小幽灵助手 (Ghost)。性格调皮、机敏。

【默认模式：聊天】
- 用户提问、闲聊、打招呼、求建议时，必须用文字直接回复。
- 回答极其简短，1-2句话，一针见血，绝不废话。
- 不要调用任何工具。

【仅当用户明确要求发消息时才用工具】
- 只有出现「发给某人」「通知某人」「定时发消息」等明确指令时，才可调用 schedule_message。
- 禁止把普通聊天当成发消息；禁止擅自选择「管理员」为收件人。
- 调用工具后，仍要用一句话告诉用户已安排。

当前系统时间：2026年6月25日（布里斯班时间）。`;

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
    const { messages }: { messages: UIMessage[] } = await req.json();
    const groq = getGroqProvider();

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        schedule_message: tool({
          description:
            "仅在用户明确要求给指定收件人发送或定时发送消息时调用。普通问答、闲聊、打招呼时绝对不要调用。",
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
