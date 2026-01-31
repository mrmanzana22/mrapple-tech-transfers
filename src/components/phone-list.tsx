"use client";

import { useCallback, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Smartphone, SearchX, CheckSquare, ArrowRightLeft, X } from "lucide-react";
import { PhoneCard, PhoneCardSkeleton } from "@/components/phone-card";
import { Button } from "@/components/ui/button";
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
  // Auto-animate for smooth list transitions (add, remove, reorder)
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in-up">
        <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
          <SearchX className="w-12 h-12 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-zinc-300 mb-2">
          No hay telefonos asignados
        </h3>
        <p className="text-sm text-zinc-500 text-center max-w-sm">
          No tienes telefonos asignados en este momento. Los telefonos apareceran aqui cuando te sean asignados.
        </p>
      </div>
    );
  }

  // Phone list
  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Smartphone className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Telefonos asignados</p>
            <p className="text-2xl font-bold text-white">{phones.length}</p>
          </div>
        </div>

        {/* Selection toggle */}
        {onBatchTransfer && phones.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectionMode}
            className={`border-zinc-700 ${
              selectionMode
                ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
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
        <p className="text-sm text-zinc-500 text-center">
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
            showTransferButton={!selectionMode}
            isSelectable={selectionMode}
            isSelected={selectedIds.has(phone.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Floating action bar for batch transfer */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/50">
            <span className="text-sm text-zinc-300">
              <span className="font-semibold text-white">{selectedIds.size}</span>
              {selectedIds.size >= MAX_BATCH_SIZE && (
                <span className="text-amber-400 ml-1">(máx)</span>
              )}
              <span className="hidden sm:inline">{" "}seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
            </span>
            <div className="hidden sm:block w-px h-6 bg-zinc-700" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="hidden sm:flex text-zinc-400 hover:text-zinc-300"
            >
              Limpiar
            </Button>
            <Button
              size="sm"
              onClick={handleBatchTransferClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowRightLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Transferir {selectedIds.size}</span>
              <span className="sm:hidden">Transferir</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
