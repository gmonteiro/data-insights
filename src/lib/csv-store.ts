import { create } from "zustand";
import type { CsvFile } from "@/types";

interface CsvStore {
  files: CsvFile[];
  addFile: (file: CsvFile) => void;
  removeFile: (id: string) => void;
  updateFileContext: (id: string, context: string) => void;
}

export const useCsvStore = create<CsvStore>((set) => ({
  files: [],
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
  updateFileContext: (id, context) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, context } : f)),
    })),
}));
