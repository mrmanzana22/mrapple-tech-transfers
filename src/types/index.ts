// Types for MrApple Tech Transfers

export interface Tecnico {
  id: string;
  nombre: string;
  pin: string;
  monday_status_value: string;
  activo: boolean;
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

// Lista de técnicos (temporal, luego viene de Supabase)
export const TECNICOS: string[] = [
  "JUAN ROJAS",
  "DIEGO JOYA",
  "LUIS SIERRA",
  "FRANK",
  "MILEIDYS",
  "MANUEL ORTIZ",
  "CRISTIAN",
  "JOHAN CARTAGO",
  "RAUL ROJAS",
];

// Estados posibles de un teléfono
export const PHONE_STATES = {
  DONE: "Done",
  REPARACION: "Reparacion",
  STOCK: "Stock",
} as const;

export type PhoneState = typeof PHONE_STATES[keyof typeof PHONE_STATES];
