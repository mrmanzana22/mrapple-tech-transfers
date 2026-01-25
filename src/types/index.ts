// Types for MrApple Tech Transfers

export interface Tecnico {
  id: string;
  nombre: string;
  pin: string;
  monday_status_value: string;
  activo: boolean;
  rol: 'tecnico' | 'jefe';
}

export interface TecnicoMetrics {
  nombre: string;
  total_transferencias: number;
  con_foto: number;
  sin_foto: number;
  porcentaje_foto: number;
}

export interface PhoneUpdate {
  id: string;
  text_body: string;
  created_at: string;
  creator: {
    name: string;
  };
}

export interface Phone {
  id: string;
  nombre: string;
  imei: string;
  estado: string;
  color: string;
  grado: string;
  gb: string;
  estado_bateria: string;
  fecha_entrega: string;
  tecnico: string;
  review?: string; // Review del teléfono (columna REVIEW en Monday)
  updates?: PhoneUpdate[];
  tiene_comentarios?: boolean;
}

export interface TransferPayload {
  item_id: string;
  tecnico_actual: string;
  tecnico_actual_nombre: string;
  nuevo_tecnico?: string;
  comentario?: string;
  foto?: File | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  tecnico: Tecnico | null;
  loading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Lista de técnicos (sincronizado con Monday.com columna Tecnico)
export const TECNICOS: string[] = [
  "JAFETH",
  "JOCEBAN",
  "NORMAN",
  "IDEL",
  "SERGIO",
];

// Estados posibles de un teléfono
export const PHONE_STATES = {
  DONE: "Done",
  REPARACION: "Reparacion",
  STOCK: "Stock",
} as const;

export type PhoneState = typeof PHONE_STATES[keyof typeof PHONE_STATES];
