"use client";

import { useCallback } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Smartphone, SearchX } from "lucide-react";
import { PhoneCard, PhoneCardSkeleton } from "@/components/phone-card";
import type { Phone } from "@/types";

// ============================================
// TYPES
// ============================================

interface PhoneListProps {
  phones: Phone[];
  onTransfer: (phone: Phone) => void;
  isLoading?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function PhoneList({ phones, onTransfer, isLoading = false }: PhoneListProps) {
  // Auto-animate for smooth list transitions (add, remove, reorder)
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  // Memoize the transfer handler
  const handleTransfer = useCallback(
    (phone: Phone) => {
      onTransfer(phone);
    },
    [onTransfer]
  );

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
      <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-fade-in-up">
        <div className="p-2 rounded-lg bg-green-500/10">
          <Smartphone className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-sm text-zinc-400">Telefonos asignados</p>
          <p className="text-2xl font-bold text-white">{phones.length}</p>
        </div>
      </div>

      {/* Grid with auto-animate for list changes */}
      <div
        ref={listRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {phones.map((phone, index) => (
          <PhoneCard
            key={phone.id}
            phone={phone}
            onTransfer={handleTransfer}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
