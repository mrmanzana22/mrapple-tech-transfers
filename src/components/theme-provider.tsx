"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Envuelve la app con next-themes. `attribute="class"` añade/quita la clase
 * `.dark` en <html>, que es lo que los tokens de globals.css escuchan.
 * `defaultTheme="system"` + `enableSystem` => arranca siguiendo el SO; si el
 * usuario toca el toggle, la elección queda guardada en localStorage.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
