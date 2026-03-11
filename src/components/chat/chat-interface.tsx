"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCsvStore } from "@/lib/csv-store";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: () => ({
    fileIds: useCsvStore.getState().files.map((f) => f.id),
  }),
});

export function ChatInterface() {
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <img
              src="/zona-sul-logo.png"
              alt="Zona Sul"
              className="mx-auto mb-4 h-12"
            />
            <p>Envie um arquivo CSV e pergunte sobre seus dados</p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} isLoading={isLoading} />
      )}
      {error && (
        <div className="mx-auto max-w-3xl px-4 py-2 text-sm text-red-600">
          Error: {error.message}
        </div>
      )}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
