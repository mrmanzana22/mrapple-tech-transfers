import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Search,
  Package,
  Inbox,
  FileQuestion,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

/* ============================================
   TYPES
   ============================================ */

type EmptyStateVariant =
  | "default"
  | "search"
  | "phones"
  | "inbox"
  | "folder"
  | "custom";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variante del estado vacio */
  variant?: EmptyStateVariant;
  /** Icono personalizado (solo para variant="custom") */
  icon?: LucideIcon;
  /** Titulo principal */
  title?: string;
  /** Descripcion o mensaje secundario */
  description?: string;
  /** Texto del boton de accion */
  actionLabel?: string;
  /** Callback del boton de accion */
  onAction?: () => void;
  /** Texto del boton secundario */
  secondaryActionLabel?: string;
  /** Callback del boton secundario */
  onSecondaryAction?: () => void;
  /** Tamano del componente */
  size?: "sm" | "md" | "lg";
}

/* ============================================
   VARIANT CONFIGS
   ============================================ */

const variantConfigs: Record<
  Exclude<EmptyStateVariant, "custom">,
  {
    icon: LucideIcon;
    title: string;
    description: string;
  }
> = {
  default: {
    icon: Inbox,
    title: "No hay datos",
    description: "No se encontraron elementos para mostrar.",
  },
  search: {
    icon: Search,
    title: "Sin resultados",
    description: "No encontramos nada con esos criterios de busqueda.",
  },
  phones: {
    icon: Smartphone,
    title: "No hay telefonos",
    description: "Aun no tienes telefonos registrados en esta lista.",
  },
  inbox: {
    icon: Package,
    title: "Bandeja vacia",
    description: "No hay mensajes ni notificaciones pendientes.",
  },
  folder: {
    icon: FolderOpen,
    title: "Carpeta vacia",
    description: "Esta carpeta no contiene archivos.",
  },
};

/* ============================================
   SIZE CONFIGS
   ============================================ */

const sizeConfigs = {
  sm: {
    container: "py-8 px-4",
    iconWrapper: "w-12 h-12",
    icon: "w-6 h-6",
    title: "text-base",
    description: "text-sm",
    buttonSize: "sm" as const,
  },
  md: {
    container: "py-12 px-6",
    iconWrapper: "w-16 h-16",
    icon: "w-8 h-8",
    title: "text-lg",
    description: "text-sm",
    buttonSize: "default" as const,
  },
  lg: {
    container: "py-16 px-8",
    iconWrapper: "w-20 h-20",
    icon: "w-10 h-10",
    title: "text-xl",
    description: "text-base",
    buttonSize: "lg" as const,
  },
};

/* ============================================
   COMPONENT
   ============================================ */

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant = "default",
      icon: CustomIcon,
      title,
      description,
      actionLabel,
      onAction,
      secondaryActionLabel,
      onSecondaryAction,
      size = "md",
      ...props
    },
    ref
  ) => {
    // Get config based on variant
    const variantConfig =
      variant === "custom"
        ? {
            icon: CustomIcon || FileQuestion,
            title: title || "Sin contenido",
            description: description || "",
          }
        : variantConfigs[variant];

    const Icon = CustomIcon || variantConfig.icon;
    const displayTitle = title || variantConfig.title;
    const displayDescription = description || variantConfig.description;

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
        {/* Illustration container */}
        <div className="relative mb-6">
          {/* Outer glow */}
          <div
            className={cn(
              "absolute inset-0 rounded-full bg-slate-800/50 blur-xl transform scale-150",
              "opacity-50"
            )}
          />

          {/* Icon wrapper */}
          <div
            className={cn(
              "relative flex items-center justify-center rounded-2xl",
              "bg-gradient-to-br from-slate-800 to-slate-900",
              "border border-slate-700/50",
              "shadow-lg shadow-black/20",
              sizeConfig.iconWrapper
            )}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent" />

            <Icon
              className={cn(
                "relative text-slate-500",
                sizeConfig.icon
              )}
              strokeWidth={1.5}
            />
          </div>

          {/* Decorative dots */}
          <div className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-slate-700" />
          <div className="absolute -left-2 top-1/2 w-1.5 h-1.5 rounded-full bg-slate-700/70" />
          <div className="absolute right-0 -bottom-2 w-1 h-1 rounded-full bg-slate-700/50" />
        </div>

        {/* Text content */}
        <div className="max-w-xs">
          <h3
            className={cn(
              "font-semibold text-slate-200 mb-2",
              sizeConfig.title
            )}
          >
            {displayTitle}
          </h3>

          {displayDescription && (
            <p
              className={cn(
                "text-slate-500 leading-relaxed",
                sizeConfig.description
              )}
            >
              {displayDescription}
            </p>
          )}
        </div>

        {/* Actions */}
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
            {actionLabel && onAction && (
              <Button
                onClick={onAction}
                size={sizeConfig.buttonSize}
                className="bg-green-600 hover:bg-green-500 text-white pressable"
              >
                {actionLabel}
              </Button>
            )}

            {secondaryActionLabel && onSecondaryAction && (
              <Button
                onClick={onSecondaryAction}
                variant="outline"
                size={sizeConfig.buttonSize}
                className="border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 pressable"
              >
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

/* ============================================
   PRESET COMPONENTS - Para uso rapido
   ============================================ */

const EmptyPhones = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "variant">
>((props, ref) => (
  <EmptyState ref={ref} variant="phones" {...props} />
));
EmptyPhones.displayName = "EmptyPhones";

const EmptySearch = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "variant">
>((props, ref) => (
  <EmptyState ref={ref} variant="search" {...props} />
));
EmptySearch.displayName = "EmptySearch";

const EmptyInbox = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "variant">
>((props, ref) => (
  <EmptyState ref={ref} variant="inbox" {...props} />
));
EmptyInbox.displayName = "EmptyInbox";

export {
  EmptyState,
  EmptyPhones,
  EmptySearch,
  EmptyInbox,
  type EmptyStateProps,
  type EmptyStateVariant,
};
