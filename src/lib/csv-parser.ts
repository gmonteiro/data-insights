import Papa from "papaparse";
import type { CsvUploadPayload } from "@/types";

export function parseCsvFile(file: File): Promise<CsvUploadPayload> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as Record<string, string>[];
        const headers = results.meta.fields ?? [];
        resolve({
          name: file.name,
          headers,
          rows,
        });
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}
