"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCsvStore } from "@/lib/csv-store";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: () => ({
    csvData: useCsvStore.getState().files,
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
            <h2 className="mb-2 text-xl font-semibold text-gray-600">
              Data Insights
            </h2>
            <p>Upload a CSV file and ask questions about your data</p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} />
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
