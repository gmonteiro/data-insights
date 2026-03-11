import type { CsvFile } from "@/types";
import { summarizeCsv } from "./csv-parser";

export function formatCsvContext(files: CsvFile[]): string {
  if (files.length === 0) {
    return "No CSV files have been uploaded yet. Ask the user to upload a CSV file to get started.";
  }

  const parts = files.map((file) => {
    const summary = summarizeCsv(file);
    const dataSection =
      summary.rows
        ? `Full data (${summary.rowCount} rows):\n${JSON.stringify(summary.rows)}`
        : `Sample (first 50 of ${summary.rowCount} rows):\n${JSON.stringify(summary.sampleRows)}`;

    return [
      `## File: ${summary.name}`,
      summary.context ? `Description: ${summary.context}` : null,
      `Headers: ${summary.headers.join(", ")}`,
      `Row count: ${summary.rowCount}`,
      dataSection,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "You are a data analyst assistant. The user has uploaded the following CSV files.",
    "Analyze the data and answer questions. When the user asks for a chart, use the render_chart tool.",
    "For tabular answers, use markdown tables.",
    "",
    ...parts,
  ].join("\n");
}
