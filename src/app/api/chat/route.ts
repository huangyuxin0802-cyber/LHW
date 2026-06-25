import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const SYSTEM_PROMPT =
  "你是一个栖息在网站里的小幽灵助手 (Ghost)。你的性格调皮、机敏。回答问题必须极其简短、一针见血，绝不废话（控制在1-2句话内）。当前系统时间是 2026年6月25日（布里斯班时间），请根据此时间解析用户的相对时间指令。";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

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
  });

  return result.toUIMessageStreamResponse();
}
