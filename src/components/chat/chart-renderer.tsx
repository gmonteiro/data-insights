"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartData } from "@/types";

const CHART_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ChartRenderer({ data }: { data: ChartData }) {
  const { rows, xAxisKey, yAxisKeys, chartType, title } = data;

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    yAxisKeys.forEach((key, i) => {
      config[key] = {
        label: key,
        color: CHART_COLOR_VARS[i % CHART_COLOR_VARS.length],
      };
    });
    return config;
  }, [yAxisKeys]);

  if (!rows?.length || !yAxisKeys?.length || !xAxisKey) return null;

  return (
    <div className="my-4 rounded-lg border bg-card p-4">
      {title && (
        <h3 className="mb-4 text-center text-sm font-semibold">{title}</h3>
      )}
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        {chartType === "bar" ? (
          <BarChart data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            {yAxisKeys.map((key) => (
              <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
            ))}
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            {yAxisKeys.map((key) => (
              <Line key={key} type="monotone" dataKey={key} stroke={`var(--color-${key})`} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            {yAxisKeys.map((key) => (
              <Area key={key} type="monotone" dataKey={key} fill={`var(--color-${key})`} stroke={`var(--color-${key})`} fillOpacity={0.3} />
            ))}
          </AreaChart>
        ) : chartType === "scatter" ? (
          <ScatterChart>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} fontSize={12} name={xAxisKey} />
            <YAxis dataKey={yAxisKeys[0]} tickLine={false} axisLine={false} fontSize={12} name={yAxisKeys[0]} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={rows} fill={`var(--color-${yAxisKeys[0]})`} />
          </ScatterChart>
        ) : (
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            <Pie data={rows} dataKey={yAxisKeys[0]} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={120}>
              {rows.map((_, i) => (
                <Cell key={i} fill={CHART_COLOR_VARS[i % CHART_COLOR_VARS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ChartContainer>
    </div>
  );
}
