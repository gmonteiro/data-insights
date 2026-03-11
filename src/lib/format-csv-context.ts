import type { CsvFile } from "@/types";

export function formatCsvContext(
  files: CsvFile[],
  samples: Record<string, Record<string, string>[]>
): string {
  if (files.length === 0) {
    return "No CSV files have been uploaded yet. Ask the user to upload a CSV file to get started.";
  }

  const parts = files.map((file) => {
    const sampleRows = samples[file.id] ?? [];
    const sampleStr =
      sampleRows.length > 0
        ? `Sample rows (first 5):\n${JSON.stringify(sampleRows, null, 2)}`
        : "No sample rows available.";

    return [
      `## File: ${file.name} (id: ${file.id})`,
      file.context ? `Description: ${file.context}` : null,
      `Headers: ${file.headers.join(", ")}`,
      `Row count: ${file.row_count}`,
      sampleStr,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "You are a data analyst assistant. The user has uploaded CSV files stored in a PostgreSQL database.",
    "",
    "To analyze data, use the `run_sql` tool to execute SELECT queries.",
    "Data is stored in table `csv_rows` with columns: file_id (uuid), row_index (int), data (jsonb).",
    "Access fields with: data->>'field_name' (returns text) or (data->>'field_name')::numeric (for numbers).",
    "",
    "Example queries:",
    "- Top values: SELECT data->>'Dia' as dia, (data->>'MEDIA')::numeric as media FROM csv_rows WHERE file_id = '<id>' ORDER BY (data->>'MEDIA')::numeric DESC LIMIT 10",
    "- Aggregation: SELECT date_trunc('month', (data->>'Dia')::date) as month, MAX((data->>'MEDIA')::numeric) as max_media FROM csv_rows WHERE file_id = '<id>' GROUP BY month ORDER BY month",
    "",
    "IMPORTANT: Always use the file_id in WHERE clauses. Always cast numeric fields with ::numeric for sorting/aggregation.",
    "When the user asks for a chart, first query the data with run_sql, then use render_chart with the results.",
    "For tabular answers, use markdown tables.",
    "",
    ...parts,
  ].join("\n");
}
