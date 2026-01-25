"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { container: "text-xs", icon: "h-3 w-3" },
  md: { container: "text-sm", icon: "h-4 w-4" },
  lg: { container: "text-base", icon: "h-5 w-5" },
};

export function TrendIndicator({ value, size = "md" }: TrendIndicatorProps) {
  const classes = sizeClasses[size];

  if (value === 0) {
    return (
      <div className={`inline-flex items-center gap-0.5 font-medium ${classes.container} text-zinc-400`}>
        <Minus className={classes.icon} />
        <span>0%</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const formattedValue = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <div
      className={`inline-flex items-center gap-0.5 font-medium ${classes.container} ${
        isPositive ? "text-green-400" : "text-red-400"
      }`}
    >
      {isPositive ? (
        <ArrowUp className={classes.icon} />
      ) : (
        <ArrowDown className={classes.icon} />
      )}
      <span>{formattedValue}</span>
    </div>
  );
}
