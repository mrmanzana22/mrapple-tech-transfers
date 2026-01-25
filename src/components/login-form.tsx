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
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-black mb-4 shadow-lg shadow-green-500/20 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-512.png"
              alt="MrApple Tech"
              className="w-20 h-20 object-contain"
            />
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
