"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = Record<string, any>[];

interface BarChartProps {
  data: ChartData;
  dataKey: string;
  nameKey: string;
  color?: string;
}

interface TooltipPayload {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="surface-raised rounded-lg px-3 py-2 shadow-e3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function BarChart({ data, dataKey, nameKey, color = "#3b82f6" }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <XAxis
          dataKey={nameKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(240 5% 60%)", fontSize: 12 }}
          dy={4}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(240 5% 60%)", fontSize: 12 }}
          width={32}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "hsl(240 4% 16% / 0.5)", radius: 6 }}
        />
        <Bar
          dataKey={dataKey}
          fill={color}
          radius={[6, 6, 2, 2]}
          maxBarSize={48}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
