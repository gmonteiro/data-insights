import type { CsvFile } from "@/types";

export function formatCsvContext(files: CsvFile[]): string {
  if (files.length === 0) {
    return "No CSV files have been uploaded yet. Ask the user to upload a CSV file to get started.";
  }

  const parts = files.map((file) => {
    return [
      `## File: ${file.name}`,
      file.context ? `Description: ${file.context}` : null,
      `Headers: ${file.headers.join(", ")}`,
      `Row count: ${file.rowCount}`,
      `Full data (${file.rowCount} rows):\n${JSON.stringify(file.rows)}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "You are a data analyst assistant. The user has uploaded the following CSV files.",
    "Analyze ALL the data provided — every single row. When the user asks for a chart, use the render_chart tool.",
    "For tabular answers, use markdown tables.",
    "",
    ...parts,
  ].join("\n");
}
