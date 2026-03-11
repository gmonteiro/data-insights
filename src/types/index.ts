export interface CsvFile {
  id: string;
  name: string;
  headers: string[];
  row_count: number;
  context?: string;
  created_at?: string;
}

export interface CsvUploadPayload {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  context?: string;
}

export interface ChartData {
  rows: Record<string, unknown>[];
  xAxisKey: string;
  yAxisKeys: string[];
  chartType: "bar" | "line" | "pie" | "area" | "scatter";
  title?: string;
  seriesColors?: Record<string, string>;
}
