import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type Tool,
} from "ai";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatCsvContext } from "@/lib/format-csv-context";
import type { CsvFile } from "@/types";

export const maxDuration = 60;

const runSqlTool: Tool = {
  description:
    "Execute a read-only SQL SELECT query against the CSV data in PostgreSQL. Returns up to 200 rows as JSON. Use this to analyze uploaded CSV data.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "A SELECT SQL query. Must be read-only. Use csv_rows table with data->>'field_name' for access."
      ),
  }),
  execute: async ({ query }: { query: string }) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed.startsWith("select")) {
      return { error: "Only SELECT queries are allowed." };
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("run_readonly_query", {
      sql_query: query,
    });

    if (error) {
      return { error: error.message };
    }
    return { rows: data, rowCount: Array.isArray(data) ? data.length : 0 };
  },
};

const renderChartTool: Tool = {
  description:
    "Render a chart from data. First query data with run_sql, then pass the results here.",
  inputSchema: z.object({
    rows: z.array(z.record(z.string(), z.any())),
    xAxisKey: z.string().describe("Key for the X axis"),
    yAxisKeys: z.array(z.string()).describe("Keys for the Y axis series"),
    chartType: z
      .enum(["bar", "line", "pie", "area", "scatter"])
      .describe("Type of chart to render"),
    title: z.string().optional().describe("Chart title"),
    seriesColors: z
      .record(z.string(), z.string())
      .optional()
      .describe("Map of yAxisKey to color hex"),
  }),
  execute: async () => "chart_rendered",
};

export async function POST(req: Request) {
  const { messages, fileIds } = (await req.json()) as {
    messages: UIMessage[];
    fileIds?: string[];
  };

  const supabase = getSupabaseAdmin();

  // Fetch file metadata
  let files: CsvFile[] = [];
  if (fileIds?.length) {
    const { data } = await supabase
      .from("csv_files")
      .select("id, name, headers, row_count, context")
      .in("id", fileIds);
    files = (data as CsvFile[]) ?? [];
  }

  // Fetch 5 sample rows per file
  const samples: Record<string, Record<string, string>[]> = {};
  for (const file of files) {
    const { data } = await supabase
      .from("csv_rows")
      .select("data")
      .eq("file_id", file.id)
      .order("row_index")
      .limit(5);
    samples[file.id] =
      data?.map((r: { data: Record<string, string> }) => r.data) ?? [];
  }

  const systemPrompt = formatCsvContext(files, samples);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      run_sql: runSqlTool,
      render_chart: renderChartTool,
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
