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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/20">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-white">MrApple Tech</h1>
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
