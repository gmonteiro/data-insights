import Papa from "papaparse";
import type { CsvFile } from "@/types";

export function parseCsvFile(file: File): Promise<CsvFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as Record<string, string>[];
        const headers = results.meta.fields ?? [];
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          headers,
          rows,
          rowCount: rows.length,
        });
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

/** Build a summary payload for the LLM. ≤2000 rows → full data, otherwise spread sample. */
export function summarizeCsv(file: CsvFile): {
  name: string;
  headers: string[];
  rowCount: number;
  context?: string;
  rows?: Record<string, string>[];
  sampleRows?: Record<string, string>[];
} {
  if (file.rowCount <= 2000) {
    return {
      name: file.name,
      headers: file.headers,
      rowCount: file.rowCount,
      context: file.context,
      rows: file.rows,
    };
  }
  // For large files, take samples from beginning, middle, and end
  const head = file.rows.slice(0, 50);
  const midStart = Math.floor(file.rowCount / 2) - 25;
  const middle = file.rows.slice(midStart, midStart + 50);
  const tail = file.rows.slice(-50);
  return {
    name: file.name,
    headers: file.headers,
    rowCount: file.rowCount,
    context: file.context,
    sampleRows: [...head, ...middle, ...tail],
  };
}
