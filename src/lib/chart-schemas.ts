import { z } from "zod";

export const renderChartSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.any()))
    .describe("Array of data objects to chart"),
  xAxisKey: z.string().describe("Key for the X axis"),
  yAxisKeys: z.array(z.string()).describe("Keys for the Y axis series"),
  chartType: z
    .enum(["bar", "line", "pie", "area", "scatter"])
    .describe("Type of chart to render"),
  title: z.string().optional().describe("Chart title"),
  seriesColors: z
    .record(z.string(), z.string())
    .optional()
    .describe("Map of yAxisKey → color hex"),
});
