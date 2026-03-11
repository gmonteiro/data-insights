import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type Tool,
} from "ai";
import { z } from "zod";
import { formatCsvContext } from "@/lib/format-csv-context";
import type { CsvFile } from "@/types";

const renderChartTool: Tool = {
  description:
    "Render a chart from data. Use this when the user asks for a visualization.",
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
  const { messages, csvData } = (await req.json()) as {
    messages: UIMessage[];
    csvData?: CsvFile[];
  };

  const systemPrompt = formatCsvContext(csvData ?? []);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-opus-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      render_chart: renderChartTool,
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
