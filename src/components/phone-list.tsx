"use client";

import { useCallback, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { verticalFade } from "@/lib/auto-animate";
import { Smartphone, CheckSquare, ArrowRightLeft, X } from "lucide-react";
import { PhoneCard, PhoneCardSkeleton } from "@/components/phone-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion";
import type { Phone } from "@/types";

const MAX_BATCH_SIZE = 10;

// ============================================
// TYPES
// ============================================

interface PhoneListProps {
  phones: Phone[];
  onTransfer: (phone: Phone) => void;
  onBatchTransfer?: (phones: Phone[]) => void;
  isLoading?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function PhoneList({ phones, onTransfer, onBatchTransfer, isLoading = false }: PhoneListProps) {
  // Auto-animate for smooth list transitions (add, remove, reorder).
  // verticalFade: solo translateY + opacity (sin scale) para que el lote
  // transferido salga sin corrimiento horizontal incómodo.
  const [listRef] = useAutoAnimate<HTMLDivElement>(verticalFade);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const disableCardAnimations = phones.length > 8;

  // Memoize the transfer handler
  const handleTransfer = useCallback(
    (phone: Phone) => {
      onTransfer(phone);
    },
    [onTransfer]
  );

  // Selection handlers
  const handleSelect = useCallback((phone: Phone) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(phone.id)) {
        next.delete(phone.id);
      } else {
        if (next.size >= MAX_BATCH_SIZE) {
          return prev; // Don't add if at limit
        }
        next.add(phone.id);
      }
      return next;
    });
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode, clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const handleBatchTransferClick = useCallback(() => {
    if (!onBatchTransfer) return;
    const selectedPhones = phones.filter((p) => selectedIds.has(p.id));
    if (selectedPhones.length > 0) {
      onBatchTransfer(selectedPhones);
    }
  }, [phones, selectedIds, onBatchTransfer]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <PhoneCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (phones.length === 0) {
    return (
      <Reveal y={16} className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-5 rounded-2xl bg-secondary ring-1 ring-inset ring-border mb-5">
          <Smartphone className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1.5">
          No hay teléfonos asignados
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          No tienes teléfonos asignados en este momento. Los teléfonos aparecerán aquí cuando te sean asignados.
        </p>
      </Reveal>
    );
  }

  // Phone list
  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl surface shadow-e1 sheen animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefonos asignados</p>
            <p className="text-2xl font-semibold text-foreground tabular-nums leading-tight mt-0.5">{phones.length}</p>
          </div>
        </div>

        {/* Selection toggle */}
        {onBatchTransfer && phones.length > 1 && (
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            className={selectionMode ? "ring-1 ring-inset ring-primary/30 text-primary" : ""}
          >
            {selectionMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Seleccionar
              </>
            )}
          </Button>
        )}
      </div>

      {/* Selection hint */}
      {selectionMode && selectedIds.size === 0 && (
        <p className="text-sm text-muted-foreground text-center animate-fade-in">
          Selecciona hasta {MAX_BATCH_SIZE} teléfonos para transferir
        </p>
      )}

      {/* Grid with auto-animate for list changes */}
      <div
        ref={listRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {phones.map((phone, index) => (
          <PhoneCard
            key={phone.id}
            phone={phone}
            onTransfer={selectionMode ? undefined : handleTransfer}
            index={index}
            disableAnimation={disableCardAnimations}
            showTransferButton={!selectionMode}
            isSelectable={selectionMode}
            isSelected={selectedIds.has(phone.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Floating action bar for batch transfer */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 animate-slide-up safe-area-bottom">
          <div className="flex items-center gap-3 px-4 py-4 sm:py-3 sm:rounded-2xl glass border-t sm:border border-border shadow-e4">
            {/* Counter */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm tabular-nums ring-1 ring-inset ring-primary/25">
                {selectedIds.size}
              </span>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size >= MAX_BATCH_SIZE ? (
                  <span className="text-amber-700 dark:text-amber-400">máximo</span>
                ) : (
                  <span className="hidden xs:inline">seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
                )}
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="px-2 sm:px-3"
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
              <Button
                size="sm"
                onClick={handleBatchTransferClick}
                className="px-3 sm:px-4"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
