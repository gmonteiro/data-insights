import { create } from "zustand";
import type { CsvFile } from "@/types";

interface CsvStore {
  files: CsvFile[];
  loading: boolean;
  fetchFiles: () => Promise<void>;
  uploadFile: (payload: {
    name: string;
    headers: string[];
    rows: Record<string, string>[];
    context?: string;
  }) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
}

export const useCsvStore = create<CsvStore>((set) => ({
  files: [],
  loading: false,

  fetchFiles: async () => {
    set({ loading: true });
    const res = await fetch("/api/files");
    const data = await res.json();
    set({ files: Array.isArray(data) ? data : [], loading: false });
  },

  uploadFile: async (payload) => {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Upload failed");
    }
    const listRes = await fetch("/api/files");
    const data = await listRes.json();
    set({ files: Array.isArray(data) ? data : [] });
  },

  deleteFile: async (id) => {
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },
}));
