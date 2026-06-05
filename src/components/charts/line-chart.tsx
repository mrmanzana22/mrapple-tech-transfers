"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface LineConfig {
  dataKey: string;
  color: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = Record<string, any>[];

interface LineChartProps {
  data: ChartData;
  lines: LineConfig[];
  xAxisKey?: string;
}

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="surface-raised min-w-[8rem] rounded-lg px-3 py-2 shadow-e3">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function LineChart({ data, lines, xAxisKey = "name" }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="2 6"
          stroke="hsl(240 4% 16%)"
          vertical={false}
        />
        <XAxis
          dataKey={xAxisKey}
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
          cursor={{ stroke: "hsl(240 4% 22%)", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Legend
          wrapperStyle={{ paddingTop: "12px" }}
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-sm text-muted-foreground">{value}</span>
          )}
        />
        {lines.map((line, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(240 5% 9%)" }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
