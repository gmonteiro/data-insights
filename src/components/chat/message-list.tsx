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

  // Concatenate consecutive text parts
  const textContent = (message.parts ?? [])
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");

  // Find chart tool parts — in v6, tool parts have type "tool-<toolName>"
  // and input/output directly on the part (no toolInvocation wrapper)
  const chartParts = (message.parts ?? []).filter(
    (p) => p.type === "tool-render_chart"
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
          const args = (part as unknown as { input: ChartData }).input;
          return args ? <ChartRenderer key={i} data={args} /> : null;
        })}
      </div>
    </div>
  );
}
