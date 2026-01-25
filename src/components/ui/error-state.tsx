import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  WifiOff,
  ServerCrash,
  ShieldAlert,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

/* ============================================
   TYPES
   ============================================ */

type ErrorVariant =
  | "default"
  | "network"
  | "server"
  | "permission"
  | "custom";

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variante del error */
  variant?: ErrorVariant;
  /** Icono personalizado */
  icon?: LucideIcon;
  /** Titulo del error */
  title?: string;
  /** Mensaje de error */
  message?: string;
  /** Detalles tecnicos (colapsable) */
  details?: string;
  /** Callback para reintentar */
  onRetry?: () => void;
  /** Texto del boton retry */
  retryLabel?: string;
  /** Estado de carga del retry */
  isRetrying?: boolean;
  /** Accion secundaria */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Tamano del componente */
  size?: "sm" | "md" | "lg";
}

/* ============================================
   VARIANT CONFIGS
   ============================================ */

const variantConfigs: Record<
  Exclude<ErrorVariant, "custom">,
  {
    icon: LucideIcon;
    title: string;
    message: string;
    iconColor: string;
    bgColor: string;
  }
> = {
  default: {
    icon: AlertCircle,
    title: "Algo salio mal",
    message: "Ocurrio un error inesperado. Por favor intenta de nuevo.",
    iconColor: "text-red-400",
    bgColor: "from-red-500/10 to-red-500/5",
  },
  network: {
    icon: WifiOff,
    title: "Sin conexion",
    message: "No pudimos conectar con el servidor. Verifica tu conexion a internet.",
    iconColor: "text-amber-400",
    bgColor: "from-amber-500/10 to-amber-500/5",
  },
  server: {
    icon: ServerCrash,
    title: "Error del servidor",
    message: "El servidor no esta respondiendo. Intenta de nuevo en unos momentos.",
    iconColor: "text-orange-400",
    bgColor: "from-orange-500/10 to-orange-500/5",
  },
  permission: {
    icon: ShieldAlert,
    title: "Acceso denegado",
    message: "No tienes permisos para realizar esta accion.",
    iconColor: "text-rose-400",
    bgColor: "from-rose-500/10 to-rose-500/5",
  },
};

/* ============================================
   SIZE CONFIGS
   ============================================ */

const sizeConfigs = {
  sm: {
    container: "py-6 px-4",
    iconWrapper: "w-10 h-10",
    icon: "w-5 h-5",
    title: "text-sm",
    message: "text-xs",
    buttonSize: "sm" as const,
  },
  md: {
    container: "py-10 px-6",
    iconWrapper: "w-14 h-14",
    icon: "w-7 h-7",
    title: "text-base",
    message: "text-sm",
    buttonSize: "default" as const,
  },
  lg: {
    container: "py-14 px-8",
    iconWrapper: "w-18 h-18",
    icon: "w-9 h-9",
    title: "text-lg",
    message: "text-base",
    buttonSize: "lg" as const,
  },
};

/* ============================================
   COMPONENT
   ============================================ */

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      variant = "default",
      icon: CustomIcon,
      title,
      message,
      details,
      onRetry,
      retryLabel = "Reintentar",
      isRetrying = false,
      secondaryAction,
      size = "md",
      ...props
    },
    ref
  ) => {
    const [showDetails, setShowDetails] = React.useState(false);

    // Get config
    const variantConfig =
      variant === "custom"
        ? {
            icon: CustomIcon || AlertCircle,
            title: title || "Error",
            message: message || "",
            iconColor: "text-red-400",
            bgColor: "from-red-500/10 to-red-500/5",
          }
        : variantConfigs[variant];

    const Icon = CustomIcon || variantConfig.icon;
    const displayTitle = title || variantConfig.title;
    const displayMessage = message || variantConfig.message;

    const sizeConfig = sizeConfigs[size];

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          sizeConfig.container,
          "animate-fade-in-up",
          className
        )}
        {...props}
      >
        {/* Icon with animated background */}
        <div className="relative mb-5">
          {/* Pulsing background */}
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-xl",
              "bg-gradient-to-br",
              variantConfig.bgColor,
              "animate-pulse-subtle"
            )}
            style={{ transform: "scale(2)" }}
          />

          {/* Icon wrapper */}
          <div
            className={cn(
              "relative flex items-center justify-center rounded-2xl",
              "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
              "border border-slate-700/50",
              "backdrop-blur-sm",
              sizeConfig.iconWrapper
            )}
          >
            <Icon
              className={cn(
                "relative",
                variantConfig.iconColor,
                sizeConfig.icon
              )}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Text content */}
        <div className="max-w-sm">
          <h3
            className={cn(
              "font-semibold text-slate-200 mb-1.5",
              sizeConfig.title
            )}
          >
            {displayTitle}
          </h3>

          <p
            className={cn(
              "text-slate-500 leading-relaxed",
              sizeConfig.message
            )}
          >
            {displayMessage}
          </p>
        </div>

        {/* Technical details (collapsible) */}
        {details && (
          <div className="mt-4 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                "text-xs text-slate-600 hover:text-slate-500",
                "transition-colors duration-200",
                "flex items-center gap-1 mx-auto"
              )}
            >
              <span>{showDetails ? "Ocultar" : "Ver"} detalles</span>
              <svg
                className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  showDetails && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                showDetails ? "max-h-32 opacity-100 mt-3" : "max-h-0 opacity-0"
              )}
            >
              <pre
                className={cn(
                  "text-xs text-slate-600 font-mono",
                  "bg-slate-900/50 rounded-lg p-3",
                  "border border-slate-800/50",
                  "overflow-auto max-h-24",
                  "text-left"
                )}
              >
                {details}
              </pre>
            </div>
          </div>
        )}

        {/* Actions */}
        {(onRetry || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                size={sizeConfig.buttonSize}
                className={cn(
                  "bg-slate-800 hover:bg-slate-700 text-slate-200",
                  "border border-slate-700",
                  "pressable"
                )}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 mr-2",
                    isRetrying && "animate-spin"
                  )}
                />
                {isRetrying ? "Reintentando..." : retryLabel}
              </Button>
            )}

            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="ghost"
                size={sizeConfig.buttonSize}
                className="text-slate-500 hover:text-slate-300 pressable"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);
ErrorState.displayName = "ErrorState";

/* ============================================
   PRESET COMPONENTS
   ============================================ */

const NetworkError = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorStateProps, "variant">
>((props, ref) => (
  <ErrorState ref={ref} variant="network" {...props} />
));
NetworkError.displayName = "NetworkError";

const ServerError = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorStateProps, "variant">
>((props, ref) => (
  <ErrorState ref={ref} variant="server" {...props} />
));
ServerError.displayName = "ServerError";

const PermissionError = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorStateProps, "variant">
>((props, ref) => (
  <ErrorState ref={ref} variant="permission" {...props} />
));
PermissionError.displayName = "PermissionError";

export {
  ErrorState,
  NetworkError,
  ServerError,
  PermissionError,
  type ErrorStateProps,
  type ErrorVariant,
};
