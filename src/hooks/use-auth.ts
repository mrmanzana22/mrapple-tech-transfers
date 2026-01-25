"use client";

import { useState, useEffect, useCallback } from "react";
import { loginWithPin } from "@/lib/api";
import type { Tecnico, AuthState } from "@/types";

const STORAGE_KEY = "mrapple_auth";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    tecnico: null,
    loading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const tecnico = JSON.parse(stored) as Tecnico;
        setState({
          isAuthenticated: true,
          tecnico,
          loading: false,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setState((prev) => ({ ...prev, loading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string; rol?: string }> => {
    setState((prev) => ({ ...prev, loading: true }));

    const result = await loginWithPin(pin);

    if (result.success && result.data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      setState({
        isAuthenticated: true,
        tecnico: result.data,
        loading: false,
      });
      return { success: true, rol: result.data.rol };
    }

    setState((prev) => ({ ...prev, loading: false }));
    return { success: false, error: result.error };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      isAuthenticated: false,
      tecnico: null,
      loading: false,
    });
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
