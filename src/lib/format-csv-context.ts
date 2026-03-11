import type { CsvFile } from "@/types";

/** Convert rows back to CSV string — much more compact than JSON */
function rowsToCsvString(headers: string[], rows: Record<string, string>[]): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => {
      const val = row[h] ?? "";
      return val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function formatCsvContext(files: CsvFile[]): string {
  if (files.length === 0) {
    return "No CSV files have been uploaded yet. Ask the user to upload a CSV file to get started.";
  }

  const parts = files.map((file) => {
    const csvString = rowsToCsvString(file.headers, file.rows);
    return [
      `## File: ${file.name}`,
      file.context ? `Description: ${file.context}` : null,
      `Headers: ${file.headers.join(", ")}`,
      `Row count: ${file.rowCount}`,
      `Full data in CSV format:\n\`\`\`csv\n${csvString}\n\`\`\``,
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
