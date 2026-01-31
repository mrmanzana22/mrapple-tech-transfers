"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, Smartphone, User, ArrowRight, MessageSquare, Clock, Hash } from "lucide-react";
import { fetchTecnicosActivos } from "@/lib/api";
import type { Phone, TransferPayload } from "@/types";

// ============================================
// TYPES
// ============================================

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: TransferPayload) => Promise<void>;
  onBatchConfirm?: (data: TransferPayload[]) => Promise<void>;
  phone?: Phone | null; // Legacy single phone support
  phones?: Phone[];     // Batch support
  currentTecnico: string;
}

// ============================================
// COMPONENT
// ============================================

export function TransferModal({
  isOpen,
  onClose,
  onConfirm,
  onBatchConfirm,
  phone,
  phones: phonesProp,
  currentTecnico,
}: TransferModalProps) {
  // Normalize to array - support both single phone (legacy) and batch
  const phones = useMemo(() => {
    return phonesProp ?? (phone ? [phone] : []);
  }, [phonesProp, phone]);
  const isBatch = phones.length > 1;
  // Form State
  const [targetTechnician, setTargetTechnician] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic technicians from Supabase
  const [tecnicos, setTecnicos] = useState<string[]>([]);

  // Load technicians on mount
  useEffect(() => {
    fetchTecnicosActivos().then(setTecnicos);
  }, []);

  // Filter out current technician from available options
  const availableTechnicians = tecnicos.filter(
    (tech) => tech !== currentTecnico
  );

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten archivos de imagen");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen no puede superar 5MB");
        return;
      }

      setPhoto(file);
      setError(null);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileChange(files[0]);
      }
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileChange(files[0]);
      }
    },
    [handleFileChange]
  );

  const removePhoto = useCallback(() => {
    setPhoto(null);
    setPhotoPreview(null);
  }, []);

  const resetForm = useCallback(() => {
    setTargetTechnician("");
    setComment("");
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }, [isLoading, resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (phones.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isBatch && onBatchConfirm) {
        // Batch transfer
        const payloads: TransferPayload[] = phones.map((p) => ({
          item_id: p.id,
          tecnico_actual: currentTecnico,
          tecnico_actual_nombre: currentTecnico,
          nuevo_tecnico: targetTechnician || undefined,
          comentario: comment || undefined,
          foto: photo,
        }));
        await onBatchConfirm(payloads);
      } else {
        // Single transfer (legacy)
        await onConfirm({
          item_id: phones[0].id,
          tecnico_actual: currentTecnico,
          tecnico_actual_nombre: currentTecnico,
          nuevo_tecnico: targetTechnician || undefined,
          comentario: comment || undefined,
          foto: photo,
        });
      }

      resetForm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al realizar la transferencia"
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetTechnician, comment, photo, phones, isBatch, currentTecnico, onConfirm, onBatchConfirm, resetForm, onClose]);

  if (phones.length === 0) return null;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-blue-500" />
            {isBatch ? `Transferir ${phones.length} Teléfonos` : "Transferir Telefono"}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Phone Info Card - Single */}
          {!isBatch && phones[0] && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Smartphone className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-zinc-100 truncate">
                    {phones[0].nombre}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    IMEI: ...{phones[0].imei?.slice(-4)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <User className="w-3 h-3 text-zinc-400" />
                    <span className="text-xs text-zinc-400">
                      Actual: {currentTecnico}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phone List - Batch */}
          {isBatch && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Teléfonos a transferir ({phones.length})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
                {phones.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-md bg-zinc-800/50 border border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Smartphone className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{p.nombre}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          ...{p.imei?.slice(-8) || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <User className="w-3 h-3 text-zinc-400" />
                <span className="text-xs text-zinc-400">
                  Técnico actual: {currentTecnico}
                </span>
              </div>
            </div>
          )}

          {/* Previous Comments - Only for single phone */}
          {!isBatch && phones[0]?.updates && phones[0].updates.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comentarios Anteriores ({phones[0].updates.length})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
                {phones[0].updates.map((update) => (
                  <div
                    key={update.id}
                    className="p-3 rounded-md bg-zinc-800/50 border border-zinc-700/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-400">
                        {update.creator?.name || "Sistema"}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(update.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                      {update.text_body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Technician Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Tecnico Destino
            </label>
            <Select
              value={targetTechnician}
              onValueChange={setTargetTechnician}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 focus:ring-blue-500">
                <SelectValue placeholder="Selecciona un tecnico (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {availableTechnicians.map((tech) => (
                  <SelectItem
                    key={tech}
                    value={tech}
                    className="cursor-pointer hover:bg-zinc-700"
                  >
                    {tech}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Comentario
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario sobre la transferencia..."
              className="min-h-[100px] resize-none bg-zinc-800 border-zinc-700 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Photo Upload Zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Foto del Estado
            </label>

            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-zinc-700 animate-photo-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={isLoading}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Eliminar foto"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                  {photo?.name}
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  relative border-2 border-dashed rounded-lg p-8
                  transition-all duration-200 cursor-pointer
                  ${
                    isDragging
                      ? "border-blue-500 bg-blue-900/20"
                      : "border-zinc-700 hover:border-zinc-600"
                  }
                  ${isLoading ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isLoading}
                  aria-label="Subir foto"
                />
                <div className="flex flex-col items-center gap-3 text-center">
                  <div
                    className={`
                    p-3 rounded-full
                    ${
                      isDragging
                        ? "bg-blue-900/40"
                        : "bg-zinc-800"
                    }
                  `}
                  >
                    <Upload
                      className={`
                      w-6 h-6
                      ${isDragging ? "text-blue-500" : "text-zinc-500"}
                    `}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      {isDragging
                        ? "Suelta la imagen aqui"
                        : "Arrastra una imagen o haz clic"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      PNG, JPG hasta 5MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              error ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 border-t border-zinc-800 gap-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none border-zinc-700 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (!targetTechnician && !comment && !photo)}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Confirmar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
