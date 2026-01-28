"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tecnico, AuthState } from "@/types";

// API helper with CSRF header
async function authFetch(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'mrapple',
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important: send cookies
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    tecnico: null,
    loading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/verificar', {
          credentials: 'include',
        });
        const data = await response.json();

        if (data.success && data.tecnico) {
          setState({
            isAuthenticated: true,
            tecnico: data.tecnico as Tecnico,
            loading: false,
          });
        } else {
          setState({
            isAuthenticated: false,
            tecnico: null,
            loading: false,
          });
        }
      } catch {
        setState({
          isAuthenticated: false,
          tecnico: null,
          loading: false,
        });
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string; rol?: string; blocked?: boolean }> => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (data.success && data.tecnico) {
        setState({
          isAuthenticated: true,
          tecnico: data.tecnico as Tecnico,
          loading: false,
        });
        return { success: true, rol: data.tecnico.rol };
      }

      setState((prev) => ({ ...prev, loading: false }));
      return {
        success: false,
        error: data.error || 'Error de autenticación',
        blocked: data.blocked || false,
      };
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore errors, clear state anyway
    }

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
