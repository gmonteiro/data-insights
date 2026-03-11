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
import type { CsvFile } from "@/types";

export function UploadModal() {
  const [open, setOpen] = useState(false);
  const [lastFile, setLastFile] = useState<CsvFile | null>(null);
  const [context, setContext] = useState("");
  const updateFileContext = useCsvStore((s) => s.updateFileContext);

  const handleFileLoaded = (file: CsvFile) => {
    setLastFile(file);
    setContext("");
  };

  const handleSaveContext = () => {
    if (lastFile && context.trim()) {
      updateFileContext(lastFile.id, context.trim());
    }
    setOpen(false);
    setLastFile(null);
    setContext("");
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
          {lastFile && (
            <>
              <CsvPreview file={lastFile} />
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
              <Button onClick={handleSaveContext} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
