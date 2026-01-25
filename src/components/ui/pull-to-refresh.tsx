import * as React from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, ArrowDown, Check } from "lucide-react";

/* ============================================
   TYPES
   ============================================ */

type PullState = "idle" | "pulling" | "threshold" | "refreshing" | "done";

interface PullToRefreshIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Estado actual del pull */
  state?: PullState;
  /** Progreso del pull (0-1) */
  progress?: number;
  /** Tamano del indicador */
  size?: "sm" | "md" | "lg";
  /** Offset vertical en px */
  offset?: number;
}

/* ============================================
   SIZE CONFIGS
   ============================================ */

const sizeConfigs = {
  sm: {
    container: "h-8",
    spinner: "w-5 h-5",
    icon: "w-4 h-4",
    text: "text-xs",
  },
  md: {
    container: "h-10",
    spinner: "w-6 h-6",
    icon: "w-5 h-5",
    text: "text-sm",
  },
  lg: {
    container: "h-12",
    spinner: "w-8 h-8",
    icon: "w-6 h-6",
    text: "text-base",
  },
};

/* ============================================
   CIRCULAR PROGRESS INDICATOR
   ============================================ */

interface CircularProgressProps {
  progress: number;
  size: number;
  strokeWidth?: number;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size,
  strokeWidth = 2,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("transform -rotate-90", className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-700/50"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="text-green-400 transition-all duration-100 ease-out"
      />
    </svg>
  );
};

/* ============================================
   MAIN COMPONENT
   ============================================ */

const PullToRefreshIndicator = React.forwardRef<
  HTMLDivElement,
  PullToRefreshIndicatorProps
>(
  (
    {
      className,
      state = "idle",
      progress = 0,
      size = "md",
      offset = 0,
      ...props
    },
    ref
  ) => {
    const sizeConfig = sizeConfigs[size];
    const spinnerSize = size === "sm" ? 20 : size === "md" ? 24 : 32;

    // Determine content based on state
    const renderContent = () => {
      switch (state) {
        case "pulling":
          return (
            <div className="relative flex items-center justify-center">
              <CircularProgress
                progress={Math.min(progress, 1)}
                size={spinnerSize}
                strokeWidth={2}
              />
              <ArrowDown
                className={cn(
                  "absolute text-green-400",
                  sizeConfig.icon,
                  "transition-transform duration-150 ease-out"
                )}
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                }}
              />
            </div>
          );

        case "threshold":
          return (
            <div className="relative flex items-center justify-center animate-pulse-subtle">
              <CircularProgress
                progress={1}
                size={spinnerSize}
                strokeWidth={2}
              />
              <ArrowDown
                className={cn(
                  "absolute text-green-400",
                  sizeConfig.icon,
                  "rotate-180"
                )}
              />
            </div>
          );

        case "refreshing":
          return (
            <div className="relative flex items-center justify-center">
              {/* iOS-style spinning ring */}
              <div
                className={cn(
                  "rounded-full border-2 border-slate-700",
                  "border-t-green-400",
                  "animate-spin",
                  sizeConfig.spinner
                )}
              />
            </div>
          );

        case "done":
          return (
            <div
              className={cn(
                "flex items-center justify-center",
                "rounded-full bg-green-500/20",
                sizeConfig.spinner,
                "animate-scale-in"
              )}
            >
              <Check className={cn("text-green-400", sizeConfig.icon)} />
            </div>
          );

        default:
          return null;
      }
    };

    // Don't render if idle
    if (state === "idle") {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center",
          "w-full",
          sizeConfig.container,
          "transition-all duration-200 ease-out",
          className
        )}
        style={{
          transform: `translateY(${offset}px)`,
          opacity: 1,
        }}
        {...props}
      >
        {renderContent()}
      </div>
    );
  }
);
PullToRefreshIndicator.displayName = "PullToRefreshIndicator";

/* ============================================
   PULL TO REFRESH CONTAINER
   Componente visual que contiene el indicador
   ============================================ */

interface PullToRefreshContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Estado actual */
  state?: PullState;
  /** Progreso (0-1) para estado pulling */
  progress?: number;
  /** Altura maxima del pull en px */
  maxPullHeight?: number;
  /** Altura actual del pull en px */
  currentPullHeight?: number;
}

const PullToRefreshContainer = React.forwardRef<
  HTMLDivElement,
  PullToRefreshContainerProps
>(
  (
    {
      className,
      state = "idle",
      progress = 0,
      maxPullHeight = 80,
      currentPullHeight = 0,
      children,
      ...props
    },
    ref
  ) => {
    // Calculate the visual height based on state
    const visualHeight = React.useMemo(() => {
      if (state === "refreshing") return 56;
      if (state === "done") return 56;
      if (state === "pulling" || state === "threshold") {
        return Math.min(currentPullHeight, maxPullHeight);
      }
      return 0;
    }, [state, currentPullHeight, maxPullHeight]);

    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        {/* Pull indicator area */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0",
            "flex items-center justify-center",
            "bg-gradient-to-b from-slate-950/50 to-transparent",
            "transition-all duration-200 ease-out",
            "z-10"
          )}
          style={{
            height: `${visualHeight}px`,
            opacity: state === "idle" ? 0 : 1,
          }}
        >
          <PullToRefreshIndicator
            state={state}
            progress={progress}
            size="md"
          />
        </div>

        {/* Content area */}
        <div
          className="transition-transform duration-200 ease-out"
          style={{
            transform: `translateY(${visualHeight}px)`,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
PullToRefreshContainer.displayName = "PullToRefreshContainer";

/* ============================================
   SIMPLE REFRESH SPINNER
   Spinner independiente para uso general
   ============================================ */

interface RefreshSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  isSpinning?: boolean;
}

const RefreshSpinner = React.forwardRef<HTMLDivElement, RefreshSpinnerProps>(
  ({ className, size = "md", isSpinning = true, ...props }, ref) => {
    const sizeConfig = sizeConfigs[size];

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center",
          className
        )}
        {...props}
      >
        <RefreshCw
          className={cn(
            "text-green-400",
            sizeConfig.spinner,
            isSpinning && "animate-spin"
          )}
        />
      </div>
    );
  }
);
RefreshSpinner.displayName = "RefreshSpinner";

/* ============================================
   IOS STYLE SPINNER
   Spinner estilo iOS puro
   ============================================ */

interface IOSSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const IOSSpinner = React.forwardRef<HTMLDivElement, IOSSpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: "w-5 h-5",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "rounded-full",
            "border-2 border-slate-700",
            "border-t-green-400",
            "animate-spin",
            sizeMap[size]
          )}
        />
      </div>
    );
  }
);
IOSSpinner.displayName = "IOSSpinner";

export {
  PullToRefreshIndicator,
  PullToRefreshContainer,
  RefreshSpinner,
  IOSSpinner,
  CircularProgress,
  type PullState,
  type PullToRefreshIndicatorProps,
  type PullToRefreshContainerProps,
};
