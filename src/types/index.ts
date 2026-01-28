// Types for MrApple Tech Transfers

export interface Tecnico {
  id: string;
  nombre: string;
  pin: string;
  monday_status_value: string;
  activo: boolean;
  rol: 'tecnico' | 'jefe';
  puede_ver_equipo?: boolean;
}

export interface TecnicoMetrics {
  nombre: string;
  total_transferencias: number;
  con_foto: number;
  sin_foto: number;
  porcentaje_foto: number;
}

// Extended metrics para dashboard del Jefe
export interface TecnicoMetricsExtended extends TecnicoMetrics {
  tendencia: 'up' | 'down' | 'stable'; // comparado con período anterior
  promedio_diario: number;
  dias_activos: number;
}

// Totales del dashboard
export interface DashboardTotals {
  total_transferencias: number;
  total_con_foto: number;
  total_sin_foto: number;
  porcentaje_foto_global: number;
  tendencia: 'up' | 'down' | 'stable';
  vs_periodo_anterior: number; // porcentaje de cambio
}

// Datos para gráfico semanal
export interface WeeklyData {
  dia: string; // 'Lun', 'Mar', etc.
  fecha: string; // ISO date
  transferencias: number;
  con_foto: number;
  sin_foto: number;
}

// Historial detallado de un técnico
export interface TecnicoHistorial {
  tecnico_nombre: string;
  periodo: {
    inicio: string;
    fin: string;
  };
  metricas: TecnicoMetricsExtended;
  por_dia: WeeklyData[];
  transferencias_recientes: {
    id: string;
    telefono: string;
    fecha: string;
    tiene_foto: boolean;
  }[];
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

// @deprecated - Usar fetchTecnicosActivos() de api.ts en su lugar
// Esta lista ahora se carga dinámicamente desde Supabase (tabla mrapple_tecnicos)
// export const TECNICOS: string[] = ["JAFETH", "JOCEBAN", "NORMAN", "IDEL", "SERGIO"];

// Estados posibles de un teléfono
export const PHONE_STATES = {
  DONE: "Done",
  REPARACION: "Reparacion",
  STOCK: "Stock",
} as const;

export type PhoneState = typeof PHONE_STATES[keyof typeof PHONE_STATES];

export interface ReparacionCliente {
  id: string;
  nombre: string;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono: string;
  tipo_reparacion: string;
  imei: string;
  estado: string;
  asignado_a: string;
  fecha: string;
  valor: number;
}
