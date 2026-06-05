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
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-secondary/60 px-1.5 py-0.5 font-medium tabular-nums text-muted-foreground ${classes.container}`}
      >
        <Minus className={classes.icon} />
        <span>0%</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const formattedValue = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium tabular-nums ${classes.container} ${
        isPositive
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
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
