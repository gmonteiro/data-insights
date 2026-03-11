export interface CsvFile {
  id: string;
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  context?: string; // user-provided description
}

export interface ChartData {
  rows: Record<string, unknown>[];
  xAxisKey: string;
  yAxisKeys: string[];
  chartType: "bar" | "line" | "pie" | "area" | "scatter";
  title?: string;
  seriesColors?: Record<string, string>;
}
