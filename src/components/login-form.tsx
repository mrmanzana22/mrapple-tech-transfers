"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoginFormProps {
  onSuccess: () => void;
  onLogin: (pin: string) => Promise<{ success: boolean; error?: string }>;
}

export function LoginForm({ onSuccess, onLogin }: LoginFormProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        onSuccess();
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

  // Variantes de animacion
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
      },
    },
  };

  const inputVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      {/* Efecto de glow sutil en el fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo / Titulo */}
        <motion.div variants={inputVariants} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 mb-4 shadow-lg shadow-green-500/20">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">MrApple Tech</h1>
          <p className="text-zinc-400 text-sm">Ingresa tu PIN de acceso</p>
        </motion.div>

        {/* PIN Inputs */}
        <motion.div
          variants={shakeVariants}
          animate={error ? "shake" : ""}
          className="flex justify-center gap-3 mb-6"
        >
          {digits.map((digit, index) => (
            <motion.div key={index} variants={inputVariants}>
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
                  w-16 h-16 sm:w-18 sm:h-18
                  text-center text-2xl font-bold
                  bg-zinc-800/50 backdrop-blur-sm
                  border-2 rounded-xl
                  text-white
                  outline-none
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    error
                      ? "border-red-500 bg-red-500/10"
                      : digit
                      ? "border-green-400 bg-green-400/10"
                      : "border-zinc-700 hover:border-zinc-600 focus:border-green-400"
                  }
                  focus:ring-2 focus:ring-green-400/20
                `}
                aria-label={`Digito ${index + 1} del PIN`}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-red-400 text-sm text-center mb-4"
            >
              {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-zinc-400"
            >
              <Loader2 className="w-5 h-5 animate-spin text-green-400" />
              <span className="text-sm">Verificando...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicador de estado */}
        <motion.div
          variants={inputVariants}
          className="flex justify-center gap-2 mt-8"
        >
          {digits.map((digit, index) => (
            <div
              key={index}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${digit ? "bg-green-400 scale-110" : "bg-zinc-700"}
              `}
            />
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={inputVariants}
          className="text-zinc-500 text-xs text-center mt-8"
        >
          Contacta al administrador si olvidaste tu PIN
        </motion.p>
      </motion.div>
    </div>
  );
}
