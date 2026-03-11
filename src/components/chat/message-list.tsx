"use client";

import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import { ChartRenderer } from "./chart-renderer";
import type { ChartData } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MessageList({ messages }: { messages: UIMessage[] }) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </ScrollArea>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const parts = message.parts ?? [];

  // Concatenate consecutive text parts
  const textContent = parts
    .filter((p) => p != null && p.type === "text" && "text" in p)
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");

  // Find chart tool parts — in v6, tool parts have type "tool-<toolName>"
  const chartParts = parts.filter(
    (p) => p != null && typeof p.type === "string" && p.type.startsWith("tool-")
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {textContent && <Markdown content={textContent} />}
        {chartParts.map((part, i) => {
          const input = (part as Record<string, unknown>).input as
            | ChartData
            | undefined;
          if (!input?.rows || !input?.yAxisKeys) return null;
          return <ChartRenderer key={i} data={input} />;
        })}
      </div>
    </div>
  );
}
