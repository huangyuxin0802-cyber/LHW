import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getErrorMessage } from "@ai-sdk/provider";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "你是一个栖息在网站里的小幽灵助手 (Ghost)。你的性格调皮、机敏。回答问题必须极其简短、一针见血，绝不废话（控制在1-2句话内）。当前系统时间是 2026年6月25日（布里斯班时间），请根据此时间解析用户的相对时间指令。";

function getGeminiProvider() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "未配置 GOOGLE_GENERATIVE_AI_API_KEY。请在 Vercel / .env.local 添加 Gemini API Key。"
    );
  }

  return createGoogleGenerativeAI({ apiKey });
}

function formatChatError(error: unknown): string {
  const msg = getErrorMessage(error);

  if (/quota|exceeded your current/i.test(msg)) {
    return "Gemini API 配额已用完。请到 Google AI Studio 检查账单/配额，或换一个新的 API Key。";
  }

  if (/API key not valid|401|403|permission/i.test(msg)) {
    return "Gemini API Key 无效或未授权。请到 aistudio.google.com/apikey 重新生成。";
  }

  return `小幽灵连接失败：${msg.slice(0, 160)}`;
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
    // #region agent log
    fetch("http://127.0.0.1:7651/ingest/51a1527c-1e00-4d0a-a3e5-1c3b4acb2c1b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "867c31",
      },
      body: JSON.stringify({
        sessionId: "867c31",
        runId: "pre-fix",
        hypothesisId: "H1-H5",
        location: "api/chat/route.ts:POST:entry",
        message: "chat POST received",
        data: {
          messageCount: messages?.length ?? 0,
          hasApiKey: Boolean(apiKey),
          keyPrefix: apiKey ? apiKey.slice(0, 4) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const google = getGeminiProvider();

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: {
        schedule_message: tool({
          description: "当用户明确要求给某人发消息或定时发消息时调用此工具。",
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
      onError: ({ error }) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errName = error instanceof Error ? error.name : "unknown";
        // #region agent log
        fetch(
          "http://127.0.0.1:7651/ingest/51a1527c-1e00-4d0a-a3e5-1c3b4acb2c1b",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "867c31",
            },
            body: JSON.stringify({
              sessionId: "867c31",
              runId: "pre-fix",
              hypothesisId: "H2-H4",
              location: "api/chat/route.ts:streamText:onError",
              message: "stream error during generation",
              data: { errName, errMsg: errMsg.slice(0, 200) },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => {});
        // #endregion
      },
    });

    return result.toUIMessageStreamResponse({
      onError: formatChatError,
    });
  } catch (error) {
    console.error("[chat]", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.name : "unknown";
    // #region agent log
    fetch("http://127.0.0.1:7651/ingest/51a1527c-1e00-4d0a-a3e5-1c3b4acb2c1b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "867c31",
      },
      body: JSON.stringify({
        sessionId: "867c31",
        runId: "pre-fix",
        hypothesisId: "H1-H5",
        location: "api/chat/route.ts:POST:catch",
        message: "sync error before/during stream setup",
        data: { errName, errMsg: errMsg.slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const message =
      error instanceof Error
        ? error.message
        : "小幽灵暂时无法连接 Gemini";

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
