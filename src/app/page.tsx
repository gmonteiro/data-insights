"use client";

import { FileSidebar } from "@/components/sidebar/file-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function Home() {
  return (
    <div className="flex h-screen">
      <FileSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
