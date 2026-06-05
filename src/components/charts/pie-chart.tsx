"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PieDataItem {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieDataItem[];
}

interface TooltipPayloadData {
  total?: number;
}

interface TooltipPayload {
  value: number;
  name: string;
  payload: TooltipPayloadData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = data.payload.total || 0;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="surface-raised rounded-lg px-3 py-2 shadow-e3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {data.name}
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
          {data.value}{" "}
          <span className="font-normal text-muted-foreground">({percentage}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) => {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    percent === undefined
  ) {
    return null;
  }
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function PieChart({ data }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithTotal = data.map((item) => ({ ...item, total }));

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
      <RechartsPieChart>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius="82%"
          innerRadius="56%"
          paddingAngle={2}
          cornerRadius={6}
          dataKey="value"
          stroke="hsl(240 5% 9%)"
          strokeWidth={3}
        >
          {dataWithTotal.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-sm text-muted-foreground">{value}</span>
          )}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
