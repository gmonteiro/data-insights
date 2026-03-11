"use client";

import { useCallback, useState } from "react";
import { parseCsvFile } from "@/lib/csv-parser";
import { useCsvStore } from "@/lib/csv-store";
import type { CsvFile } from "@/types";

interface CsvDropzoneProps {
  onFileLoaded?: (file: CsvFile) => void;
}

export function CsvDropzone({ onFileLoaded }: CsvDropzoneProps) {
  const addFile = useCsvStore((s) => s.addFile);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      setError(null);
      for (const file of Array.from(fileList)) {
        if (!file.name.endsWith(".csv")) {
          setError("Only CSV files are supported");
          continue;
        }
        try {
          const parsed = await parseCsvFile(file);
          addFile(parsed);
          onFileLoaded?.(parsed);
        } catch {
          setError(`Failed to parse ${file.name}`);
        }
      }
    },
    [addFile, onFileLoaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
        dragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv";
        input.multiple = true;
        input.onchange = () => {
          if (input.files) handleFiles(input.files);
        };
        input.click();
      }}
    >
      <p className="text-sm text-gray-500">
        Drop CSV files here or click to browse
      </p>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
