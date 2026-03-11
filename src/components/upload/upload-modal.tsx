"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CsvDropzone } from "./csv-dropzone";
import { CsvPreview } from "./csv-preview";
import { useCsvStore } from "@/lib/csv-store";
import type { CsvUploadPayload } from "@/types";

export function UploadModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<CsvUploadPayload | null>(null);
  const [context, setContext] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadFile = useCsvStore((s) => s.uploadFile);

  const handleFileLoaded = (p: CsvUploadPayload) => {
    setPayload(p);
    setContext("");
    setError(null);
  };

  const handleUpload = async () => {
    if (!payload) return;
    setUploading(true);
    setError(null);
    try {
      await uploadFile({ ...payload, context: context.trim() || undefined });
      setOpen(false);
      setPayload(null);
      setContext("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="w-full" />}
      >
        + Upload CSV
      </SheetTrigger>
      <SheetContent side="left" className="w-[450px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Upload CSV File</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <CsvDropzone onFileLoaded={handleFileLoaded} />
          {payload && (
            <>
              <CsvPreview
                file={{
                  headers: payload.headers,
                  rows: payload.rows,
                  row_count: payload.rows.length,
                }}
              />
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Describe this data (optional)
                </label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Monthly sales data for 2024..."
                  rows={3}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleUpload}
                className="w-full"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
