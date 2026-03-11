"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CsvFile } from "@/types";
import { useCsvStore } from "@/lib/csv-store";

export function FileCard({ file }: { file: CsvFile }) {
  const deleteFile = useCsvStore((s) => s.deleteFile);

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <div className="mt-1 flex gap-1">
            <Badge variant="secondary" className="text-xs">
              {file.row_count} rows
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {file.headers.length} cols
            </Badge>
          </div>
          {file.context && (
            <p className="mt-1 truncate text-xs text-gray-500">
              {file.context}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
          onClick={() => deleteFile(file.id)}
        >
          x
        </Button>
      </div>
    </Card>
  );
}
