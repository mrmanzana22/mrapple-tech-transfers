"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { gsap, useGSAP, EASE, DURATION } from "@/lib/gsap";

interface LoginFormProps {
  onSuccess: (rol?: string) => void;
  onLogin: (pin: string) => Promise<{ success: boolean; error?: string; rol?: string }>;
}

export function LoginForm({ onSuccess, onLogin }: LoginFormProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Presentation-only: scope for the GSAP entrance orchestration.
  const scopeRef = useRef<HTMLDivElement | null>(null);

  // Trigger mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Choreographed entrance (presentation only). Honors reduced-motion.
  useGSAP(
    () => {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        gsap.set("[data-anim]", { opacity: 1, y: 0, scale: 1 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: EASE.outQuint } });
      tl.fromTo(
        "[data-anim='brand']",
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: DURATION.slow }
      )
        .fromTo(
          "[data-anim='pin']",
          { opacity: 0, y: 14, scale: 0.92 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: DURATION.base,
            stagger: 0.06,
            ease: EASE.outQuint,
          },
          "-=0.25"
        )
        .fromTo(
          "[data-anim='meta']",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: DURATION.base, stagger: 0.05 },
          "-=0.1"
        );
    },
    { scope: scopeRef }
  );

  // Auto-submit cuando se completan los 4 digitos
  useEffect(() => {
    const pin = digits.join("");
    if (pin.length === 4 && digits.every((d) => d !== "")) {
      handleSubmit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleSubmit = async (pin: string) => {
    setIsLoading(true);
    setError(false);
    setErrorMessage("");

    try {
      const result = await onLogin(pin);

      if (result.success) {
        onSuccess(result.rol);
      } else {
        triggerError(result.error || "PIN incorrecto");
      }
    } catch {
      triggerError("Error de conexion");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerError = (message: string) => {
    setError(true);
    setErrorMessage(message);
    setDigits(["", "", "", ""]);
    inputRefs.current[0]?.focus();

    // Reset error state despues de la animacion
    setTimeout(() => setError(false), 600);
  };

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Solo aceptar digitos
      if (value && !/^\d$/.test(value)) return;

      const newDigits = [...digits];
      newDigits[index] = value;
      setDigits(newDigits);

      // Auto-focus al siguiente input
      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      // Backspace: borrar y volver al anterior
      if (e.key === "Backspace") {
        if (digits[index] === "" && index > 0) {
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          setDigits(newDigits);
          inputRefs.current[index - 1]?.focus();
        } else {
          const newDigits = [...digits];
          newDigits[index] = "";
          setDigits(newDigits);
        }
        e.preventDefault();
      }

      // Flecha izquierda
      if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      // Flecha derecha
      if (e.key === "ArrowRight" && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").slice(0, 4);

      if (/^\d+$/.test(pastedData)) {
        const newDigits = [...digits];
        pastedData.split("").forEach((char, i) => {
          if (i < 4) newDigits[i] = char;
        });
        setDigits(newDigits);

        // Focus en el ultimo input llenado o el siguiente vacio
        const focusIndex = Math.min(pastedData.length, 3);
        inputRefs.current[focusIndex]?.focus();
      }
    },
    [digits]
  );

  return (
    <div
      ref={scopeRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-6"
    >
      {/* Ambient depth — quiet neutral wash + a single, restrained accent bloom */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,hsl(var(--vignette)),transparent_60%)]" />
        <div className="absolute left-1/2 top-[38%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
      </div>

      <div
        className={`relative z-10 w-full max-w-[20rem] ${
          mounted ? "" : "opacity-0"
        }`}
      >
        {/* Brand */}
        <div data-anim="brand" className="mb-12 flex flex-col items-center text-center">
          <div className="relative mb-5 grid h-20 w-20 place-items-center overflow-hidden rounded-[1.25rem] bg-black shadow-e3 ring-1 ring-white/10">
            <div className="sheen pointer-events-none absolute inset-0" />
            <Image
              src="/icon-512.png"
              width={56}
              height={56}
              alt="Mr. Manzana"
              priority
              className="relative"
            />
          </div>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-foreground">
            Mr. Manzana
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ingresa tu PIN de acceso
          </p>
        </div>

        {/* PIN Inputs */}
        <div
          className={`flex justify-center gap-3 ${error ? "animate-shake" : ""}`}
        >
          {digits.map((digit, index) => (
            <div key={index} data-anim="pin">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                autoFocus={index === 0}
                className={`
                  h-16 w-14 sm:h-[4.25rem] sm:w-[3.75rem]
                  rounded-2xl border text-center text-2xl font-semibold tabular-nums
                  text-foreground caret-primary
                  shadow-e1 outline-none backdrop-blur-sm
                  transition-[border-color,background-color,box-shadow,transform]
                  duration-base ease-out-quint
                  disabled:cursor-not-allowed disabled:opacity-50
                  ${
                    error
                      ? "border-destructive bg-destructive/10 shadow-e1"
                      : digit
                      ? "border-primary/60 bg-primary/[0.07] shadow-e1"
                      : "border-border bg-card/70 hover:border-muted-foreground/40 focus:border-primary/70 focus:bg-card"
                  }
                  focus:ring-2 focus:ring-ring/25
                `}
                aria-label={`Digito ${index + 1} del PIN`}
              />
            </div>
          ))}
        </div>

        {/* Status dots */}
        <div data-anim="meta" className="mt-7 flex justify-center gap-2.5">
          {digits.map((digit, index) => (
            <div
              key={index}
              className={`
                h-1.5 w-1.5 rounded-full transition-all duration-base ease-out-quint
                ${digit ? "scale-125 bg-primary" : "bg-muted-foreground/30"}
              `}
            />
          ))}
        </div>

        {/* Error Message */}
        <div
          className={`overflow-hidden transition-all duration-base ease-out-quint ${
            errorMessage ? "mt-5 max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className="text-center text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        </div>

        {/* Loading Indicator */}
        <div
          className={`overflow-hidden transition-all duration-base ease-out-quint ${
            isLoading ? "mt-5 max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Verificando...</span>
          </div>
        </div>

        {/* Footer */}
        <p
          data-anim="meta"
          className="mt-12 text-center text-xs leading-relaxed text-muted-foreground"
        >
          Contacta al administrador si olvidaste tu PIN
        </p>
      </div>
    </div>
  );
}
