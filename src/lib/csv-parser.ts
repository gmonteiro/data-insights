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
