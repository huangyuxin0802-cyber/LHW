import type { ChatTransport, UIMessage } from "ai";
import { createPetChatStream, type PetChatContext } from "@/lib/pet-chat";

export class PetChatTransport implements ChatTransport<UIMessage> {
  constructor(private getContext: () => PetChatContext) {}

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    return createPetChatStream(messages, this.getContext(), abortSignal);
  }

  async reconnectToStream() {
    return null;
  }
}
