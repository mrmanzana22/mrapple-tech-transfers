"use client";

import Image from "next/image";
import { LogOut, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================
// TYPES
// ============================================

interface HeaderProps {
  tecnicoNombre: string;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isSyncing?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function Header({
  tecnicoNombre,
  onLogout,
  onRefresh,
  isRefreshing = false,
  isSyncing = false,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg animate-slide-down">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-black shadow-lg shadow-green-500/20 overflow-hidden">
            <Image
              src="/icon-192.png"
              width={32}
              height={32}
              alt="Mr. Manzana"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-white">Mr. Manzana</h1>
            <p className="text-xs text-zinc-500">Transferencias</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* User badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
            <User className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-zinc-300">
              {tecnicoNombre}
            </span>
          </div>

          {/* Mobile user name */}
          <span className="sm:hidden text-sm font-medium text-zinc-300 truncate max-w-[100px]">
            {tecnicoNombre}
          </span>

          {/* Sync indicator + Refresh button */}
          <div className="flex items-center gap-2">
            {isSyncing && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 hidden sm:inline">Sincronizando</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <RefreshCw
                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Actualizar</span>
            </Button>
          </div>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="sr-only">Cerrar sesion</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
