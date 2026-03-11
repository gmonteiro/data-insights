"use client";

import { useEffect } from "react";
import { useCsvStore } from "@/lib/csv-store";
import { FileCard } from "./file-card";
import { UploadModal } from "../upload/upload-modal";
import { Separator } from "@/components/ui/separator";

export function FileSidebar() {
  const files = useCsvStore((s) => s.files);
  const loading = useCsvStore((s) => s.loading);
  const fetchFiles = useCsvStore((s) => s.fetchFiles);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50 p-3">
      <h2 className="mb-2 text-sm font-semibold text-gray-700">Files</h2>
      <UploadModal />
      <Separator className="my-3" />
      <div className="flex-1 space-y-2 overflow-auto">
        {loading ? (
          <p className="text-center text-xs text-gray-400">Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            No files uploaded
          </p>
        ) : (
          files.map((f) => <FileCard key={f.id} file={f} />)
        )}
      </div>
    </div>
  );
}
