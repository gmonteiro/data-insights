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

/** Build a summary payload for the LLM. ≤500 rows → full data, otherwise summary. */
export function summarizeCsv(file: CsvFile): {
  name: string;
  headers: string[];
  rowCount: number;
  context?: string;
  rows?: Record<string, string>[];
  sampleRows?: Record<string, string>[];
} {
  if (file.rowCount <= 500) {
    return {
      name: file.name,
      headers: file.headers,
      rowCount: file.rowCount,
      context: file.context,
      rows: file.rows,
    };
  }
  return {
    name: file.name,
    headers: file.headers,
    rowCount: file.rowCount,
    context: file.context,
    sampleRows: file.rows.slice(0, 50),
  };
}
