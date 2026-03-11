"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="border-t bg-white p-4">
      <div className="mx-auto flex max-w-3xl gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your data..."
          className="min-h-[44px] flex-1 resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "..." : "Send"}
        </Button>
      </div>
    </form>
  );
}
