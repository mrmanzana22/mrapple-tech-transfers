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

  // El modal abre/cierra como una sola pieza (animación `dialog-pop` en
  // DialogContent). Ya no escalonamos las secciones internas: ese stagger se
  // sentía amateur en un formulario. Entrada cohesiva = más limpia.

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
      <DialogContent className="sm:max-w-[500px] p-0 bg-popover border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 hairline-b sheen">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-inset ring-primary/25">
              <ArrowRight className="w-4 h-4 text-primary" />
            </span>
            {isBatch ? `Transferir ${phones.length} Teléfonos` : "Transferir Telefono"}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Phone Info Card - Single */}
          {!isBatch && phones[0] && (
            <div data-modal-section className="surface rounded-xl p-4 sheen">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-secondary rounded-xl ring-1 ring-inset ring-border">
                  <Smartphone className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {phones[0].nombre}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono tabular-nums mt-0.5">
                    IMEI: ...{phones[0].imei?.slice(-4)}
                  </p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Actual: <span className="text-foreground/80 font-medium">{currentTecnico}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phone List - Batch */}
          {isBatch && (
            <div data-modal-section className="space-y-2">
              <label className="text-sm font-medium text-foreground/90 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                Teléfonos a transferir ({phones.length})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-border bg-background/40 p-3">
                {phones.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/60 ring-1 ring-inset ring-border/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground/90 truncate">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono tabular-nums">
                          <Hash className="w-3 h-3" />
                          ...{p.imei?.slice(-8) || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Técnico actual: <span className="text-foreground/80 font-medium">{currentTecnico}</span>
                </span>
              </div>
            </div>
          )}

          {/* Previous Comments - Only for single phone */}
          {!isBatch && phones[0]?.updates && phones[0].updates.length > 0 && (
            <div data-modal-section className="space-y-2">
              <label className="text-sm font-medium text-foreground/90 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Comentarios Anteriores ({phones[0].updates.length})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl border border-border bg-background/40 p-3">
                {phones[0].updates.map((update) => (
                  <div
                    key={update.id}
                    className="p-3 rounded-lg bg-secondary/60 ring-1 ring-inset ring-border/60"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-primary">
                        {update.creator?.name || "Sistema"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" />
                        {new Date(update.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {update.text_body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Technician Select */}
          <div data-modal-section className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">
              Tecnico Destino
            </label>
            <Select
              value={targetTechnician}
              onValueChange={setTargetTechnician}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tecnico (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {availableTechnicians.map((tech) => (
                  <SelectItem
                    key={tech}
                    value={tech}
                    className="cursor-pointer"
                  >
                    {tech}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment Textarea */}
          <div data-modal-section className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">
              Comentario
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario sobre la transferencia..."
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Photo Upload Zone */}
          <div data-modal-section className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">
              Foto del Estado
            </label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border animate-photo-in">
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
                  className="pressable absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Eliminar foto"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs text-white">
                  {photo?.name}
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  relative border-2 border-dashed rounded-xl p-8
                  transition-[border-color,background-color] duration-base ease-out-quint cursor-pointer
                  ${
                    isDragging
                      ? "border-primary/60 bg-primary/[0.06]"
                      : "border-border hover:border-muted-foreground/40 hover:bg-secondary/40"
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
                    p-3 rounded-full transition-colors duration-base ease-out-quint
                    ${
                      isDragging
                        ? "bg-primary/15 ring-1 ring-inset ring-primary/25"
                        : "bg-secondary ring-1 ring-inset ring-border"
                    }
                  `}
                  >
                    <Upload
                      className={`
                      w-6 h-6 transition-colors duration-base ease-out-quint
                      ${isDragging ? "text-primary" : "text-muted-foreground"}
                    `}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/90">
                      {isDragging
                        ? "Suelta la imagen aqui"
                        : "Arrastra una imagen o haz clic"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG hasta 5MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          <div
            className={`overflow-hidden transition-all duration-base ease-out-quint ${
              error ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="p-3 bg-destructive/10 ring-1 ring-inset ring-destructive/25 rounded-xl">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 hairline-t gap-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (!targetTechnician && !comment && !photo)}
            className="flex-1 sm:flex-none"
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
