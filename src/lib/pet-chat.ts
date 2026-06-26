import { createGroq } from "@ai-sdk/groq";
import { getErrorMessage } from "@ai-sdk/provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import {
  buildPetSystemPrompt,
  STRIKE_MESSAGES,
  type PetChatContext,
} from "@/lib/pet-chat-prompt";

export type { PetChatContext };

export function getGroqApiKey() {
  return process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim() ?? "";
}

export function formatPetChatError(error: unknown): string {
  const msg = getErrorMessage(error);

  if (/rate limit|429|quota/i.test(msg)) {
    return "Groq API 请求过快或配额已满，请稍后再试。";
  }

  if (/invalid.*api.*key|401|403|unauthorized/i.test(msg)) {
    return "Groq API Key 无效或未授权。请到 console.groq.com 检查 Key。";
  }

  return `小幽灵连接失败：${msg.slice(0, 160)}`;
}

export function createPetChatStream(
  messages: UIMessage[],
  context: PetChatContext,
  abortSignal?: AbortSignal
) {
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    throw new Error(
      "未配置 NEXT_PUBLIC_GROQ_API_KEY。请在 .env.local 添加 Groq API Key。"
    );
  }

  if (context.hunger < 20) {
    const message =
      STRIKE_MESSAGES[Math.floor(Math.random() * STRIKE_MESSAGES.length)];

    return createUIMessageStream({
      execute: ({ writer }) => {
        const textId = "strike-response";
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: message });
        writer.write({ type: "text-end", id: textId });
      },
    });
  }

  const groq = createGroq({ apiKey });

  return createUIMessageStream({
    onError: formatPetChatError,
    execute: async ({ writer }) => {
      const result = streamText({
        model: groq("llama-3.3-70b-versatile"),
        system: buildPetSystemPrompt(context),
        messages: await convertToModelMessages(messages),
        abortSignal,
        temperature: 0.72,
        maxOutputTokens: 220,
        stopWhen: stepCountIs(3),
        tools: {
          remember_preference: tool({
            description: "当用户透露偏好、习惯或心情时，写入记忆档案。",
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
              "仅在用户明确要求给指定收件人发送或定时发送消息时调用。",
            inputSchema: z.object({
              recipient: z.string().describe("收件人"),
              time: z.string().describe("发送时间描述"),
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

      writer.merge(result.toUIMessageStream());
    },
  });
}
