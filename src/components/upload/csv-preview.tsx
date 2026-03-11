"use client";

import type { CsvFile } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CsvPreview({ file }: { file: CsvFile }) {
  const previewRows = file.rows.slice(0, 10);

  return (
    <div className="mt-4 max-h-[300px] overflow-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow>
            {file.headers.map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewRows.map((row, i) => (
            <TableRow key={i}>
              {file.headers.map((h) => (
                <TableCell key={h} className="whitespace-nowrap text-xs">
                  {row[h]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {file.rowCount > 10 && (
        <p className="p-2 text-center text-xs text-gray-400">
          Showing 10 of {file.rowCount} rows
        </p>
      )}
    </div>
  );
}
