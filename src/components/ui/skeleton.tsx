import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

/* ============================================
   BASE SKELETON COMPONENT
   ============================================ */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant del skeleton */
  variant?: "default" | "circular" | "rounded";
  /** Mostrar animacion shimmer */
  shimmer?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "default", shimmer = true, ...props }, ref) => {
    const variantStyles = {
      default: "rounded-md",
      circular: "rounded-full",
      rounded: "rounded-lg",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden bg-slate-800/60",
          variantStyles[variant],
          shimmer && "skeleton-shimmer",
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

/* ============================================
   SKELETON TEXT - Para lineas de texto
   ============================================ */

interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numero de lineas */
  lines?: number;
  /** Ancho de la ultima linea (porcentaje) */
  lastLineWidth?: number;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 1, lastLineWidth = 75, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{
              width: i === lines - 1 && lines > 1 ? `${lastLineWidth}%` : "100%",
            }}
          />
        ))}
      </div>
    );
  }
);
SkeletonText.displayName = "SkeletonText";

/* ============================================
   PHONE CARD SKELETON - Match exacto del PhoneCard
   ============================================ */

const PhoneCardSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      <Card className="relative overflow-hidden border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-xl shadow-black/20">
        {/* Gradient accent line - estatico */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Phone icon + name area */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Icon container */}
              <Skeleton className="flex-shrink-0 h-9 w-9 rounded-lg" />

              {/* Name and color */}
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-3/4 max-w-[140px]" />
                <Skeleton className="h-3 w-1/3 max-w-[60px] mt-1.5" />
              </div>
            </div>

            {/* Status badge area */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Comment indicator (opcional) */}
              <Skeleton className="h-7 w-7 rounded-md opacity-50" />
              {/* Status badge */}
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          {/* Info grid - 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* IMEI */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
              <Skeleton className="h-4 flex-1 max-w-[80px]" />
            </div>

            {/* Capacity */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
              <Skeleton className="h-4 w-14" />
            </div>

            {/* Battery */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
              <Skeleton className="h-4 w-10" />
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Grade badge */}
          <div className="mt-4">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          {/* Transfer button */}
          <Skeleton className="h-9 w-full rounded-md" />
        </CardFooter>
      </Card>
    </div>
  );
});
PhoneCardSkeleton.displayName = "PhoneCardSkeleton";

/* ============================================
   PHONE LIST SKELETON - Lista completa
   ============================================ */

interface PhoneListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numero de cards a mostrar */
  count?: number;
}

const PhoneListSkeleton = React.forwardRef<HTMLDivElement, PhoneListSkeletonProps>(
  ({ className, count = 3, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {Array.from({ length: count }).map((_, i) => (
          <PhoneCardSkeleton
            key={i}
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  }
);
PhoneListSkeleton.displayName = "PhoneListSkeleton";

/* ============================================
   INLINE SKELETON - Para textos inline
   ============================================ */

const SkeletonInline = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-block h-4 w-20 align-middle rounded skeleton-shimmer bg-slate-800/60",
        className
      )}
      {...props}
    />
  );
});
SkeletonInline.displayName = "SkeletonInline";

/* ============================================
   AVATAR SKELETON
   ============================================ */

interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeStyles = {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
    };

    return (
      <Skeleton
        ref={ref}
        variant="circular"
        className={cn(sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
SkeletonAvatar.displayName = "SkeletonAvatar";

/* ============================================
   SKELETON CARD - Card generica
   ============================================ */

const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <Card
      ref={ref}
      className={cn(
        "border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4 mb-4">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={3} lastLineWidth={60} />
    </Card>
  );
});
SkeletonCard.displayName = "SkeletonCard";

/* ============================================
   CSS-IN-JS STYLES (para agregar al globals.css)
   ============================================ */

// Agregar esto al archivo globals.css o importar animations.css:
// .skeleton-shimmer {
//   background: linear-gradient(
//     90deg,
//     transparent 0%,
//     rgba(255, 255, 255, 0.04) 50%,
//     transparent 100%
//   );
//   background-size: 200% 100%;
//   animation: shimmer 1.5s ease-in-out infinite;
// }

export {
  Skeleton,
  SkeletonText,
  SkeletonInline,
  SkeletonAvatar,
  SkeletonCard,
  PhoneCardSkeleton,
  PhoneListSkeleton,
};
