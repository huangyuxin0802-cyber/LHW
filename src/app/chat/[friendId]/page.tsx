import ChatPageClient from "./ChatPageClient";

export function generateStaticParams() {
  return [{ friendId: "_" }];
}

export default function ChatPage() {
  return <ChatPageClient />;
}
