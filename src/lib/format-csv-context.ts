import type { CsvFile } from "@/types";

// Rough estimate: ~4 chars per token on average
const MAX_CHARS = 600_000; // ~150K tokens, leaves room for messages + response

/** Convert rows back to CSV string — much more compact than JSON */
function rowsToCsvString(
  headers: string[],
  rows: Record<string, string>[]
): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? "";
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function formatCsvContext(files: CsvFile[]): string {
  if (files.length === 0) {
    return "No CSV files have been uploaded yet. Ask the user to upload a CSV file to get started.";
  }

  // Build all CSV strings first, then budget-fit
  const fileParts = files.map((file) => ({
    file,
    csv: rowsToCsvString(file.headers, file.rows),
  }));

  const totalChars = fileParts.reduce((sum, p) => sum + p.csv.length, 0);

  const parts = fileParts.map(({ file, csv }) => {
    let dataSection: string;

    if (totalChars <= MAX_CHARS) {
      // Everything fits
      dataSection = `Full data (${file.rowCount} rows):\n\`\`\`csv\n${csv}\n\`\`\``;
    } else {
      // Budget each file proportionally
      const budget = Math.floor(
        (MAX_CHARS * csv.length) / totalChars
      );
      if (csv.length <= budget) {
        dataSection = `Full data (${file.rowCount} rows):\n\`\`\`csv\n${csv}\n\`\`\``;
      } else {
        // Take rows until budget is reached
        const lines = csv.split("\n");
        const header = lines[0];
        let taken = header.length;
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          if (taken + lines[i].length + 1 > budget) break;
          taken += lines[i].length + 1;
          count++;
        }
        const truncatedCsv = lines.slice(0, count + 1).join("\n");
        dataSection = `Data (first ${count} of ${file.rowCount} rows — file too large to include all rows):\n\`\`\`csv\n${truncatedCsv}\n\`\`\``;
      }
    }

    return [
      `## File: ${file.name}`,
      file.context ? `Description: ${file.context}` : null,
      `Headers: ${file.headers.join(", ")}`,
      `Row count: ${file.rowCount}`,
      dataSection,
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
