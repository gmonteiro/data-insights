"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartData } from "@/types";

const DEFAULT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function getColor(
  key: string,
  index: number,
  seriesColors?: Record<string, string>
) {
  return seriesColors?.[key] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export function ChartRenderer({ data }: { data: ChartData }) {
  const { rows, xAxisKey, yAxisKeys, chartType, title, seriesColors } = data;

  if (!rows?.length || !yAxisKeys?.length || !xAxisKey) return null;

  return (
    <div className="my-4 rounded-lg border bg-white p-4">
      {title && (
        <h3 className="mb-2 text-center text-sm font-semibold">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={350}>
        {chartType === "bar" ? (
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={getColor(key, i, seriesColors)}
              />
            ))}
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getColor(key, i, seriesColors)}
              />
            ))}
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={getColor(key, i, seriesColors)}
                stroke={getColor(key, i, seriesColors)}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        ) : chartType === "scatter" ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} fontSize={12} name={xAxisKey} />
            <YAxis
              dataKey={yAxisKeys[0]}
              fontSize={12}
              name={yAxisKeys[0]}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              data={rows}
              fill={getColor(yAxisKeys[0], 0, seriesColors)}
            />
          </ScatterChart>
        ) : (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={rows}
              dataKey={yAxisKeys[0]}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
            >
              {rows.map((_, i) => (
                <Cell
                  key={i}
                  fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
