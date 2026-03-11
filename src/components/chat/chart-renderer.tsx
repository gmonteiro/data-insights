"use client";

import { useMemo } from "react";
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

function oklchToHex(oklch: string): string {
  if (!oklch || typeof document === "undefined") return "#ED1C24";
  const el = document.createElement("div");
  el.style.color = oklch;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const match = computed.match(/\d+/g);
  if (!match || match.length < 3) return "#ED1C24";
  return (
    "#" +
    match
      .slice(0, 3)
      .map((v) => parseInt(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function resolveChartColors(): string[] {
  if (typeof window === "undefined") return ["#ED1C24", "#c41920", "#9b1419", "#7a1014", "#5c0c0f"];
  const style = getComputedStyle(document.documentElement);
  return [1, 2, 3, 4, 5].map((n) => {
    const raw = style.getPropertyValue(`--chart-${n}`).trim();
    if (!raw) return "#ED1C24";
    if (raw.startsWith("#")) return raw;
    return oklchToHex(raw);
  });
}

function getColor(
  colors: string[],
  key: string,
  index: number,
  seriesColors?: Record<string, string>
) {
  return seriesColors?.[key] ?? colors[index % colors.length];
}

export function ChartRenderer({ data }: { data: ChartData }) {
  const { rows, xAxisKey, yAxisKeys, chartType, title, seriesColors } = data;
  const colors = useMemo(() => resolveChartColors(), []);

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
                fill={getColor(colors, key, i, seriesColors)}
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
                stroke={getColor(colors, key, i, seriesColors)}
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
                fill={getColor(colors, key, i, seriesColors)}
                stroke={getColor(colors, key, i, seriesColors)}
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
              fill={getColor(colors, yAxisKeys[0], 0, seriesColors)}
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
                  fill={colors[i % colors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
