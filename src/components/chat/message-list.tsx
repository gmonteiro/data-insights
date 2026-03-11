"use client";

import { useRef, useEffect } from "react";
import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import { ChartRenderer } from "./chart-renderer";
import type { ChartData } from "@/types";

export function MessageList({
  messages,
  isLoading,
}: {
  messages: UIMessage[];
  isLoading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <span className="animate-pulse">●</span> Analisando seus dados...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const parts = message.parts ?? [];

  // Concatenate consecutive text parts with newline separator
  const textContent = parts
    .filter((p) => p != null && p.type === "text" && "text" in p)
    .map((p) => {
      const text = (p as { type: "text"; text: string }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");

  // Find chart tool parts — in v6, tool parts have type "tool-render_chart"
  const chartParts = parts.filter(
    (p) =>
      p != null &&
      typeof p.type === "string" &&
      p.type === "tool-render_chart"
  );

  // Check if model is mid-tool-call (has tool parts but no text yet)
  const hasToolActivity = parts.some(
    (p) =>
      p != null &&
      typeof p.type === "string" &&
      p.type.startsWith("tool-") &&
      p.type !== "tool-render_chart"
  );
  const showToolIndicator = !isUser && !textContent && hasToolActivity;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser ? "bg-[#ED1C24] text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {showToolIndicator && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <span className="animate-pulse">●</span> Consultando dados...
          </span>
        )}
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
