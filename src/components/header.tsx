"use client";

import { motion } from "framer-motion";
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
}

// ============================================
// COMPONENT
// ============================================

export function Header({
  tecnicoNombre,
  onLogout,
  onRefresh,
  isRefreshing = false,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-black shadow-lg shadow-green-500/20 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt="Mr. Manzana"
              className="w-8 h-8 object-contain"
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

          {/* Refresh button */}
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
    </motion.header>
  );
}
