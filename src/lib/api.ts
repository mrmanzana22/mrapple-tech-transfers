// API calls to n8n webhooks
// Note: All Supabase calls now go through server-side API routes (no anon key in frontend)

import { config } from "./config";
import { compressImageForUpload } from "./image-compress";
import type { Phone, TransferPayload, ApiResponse, ReparacionCliente } from "@/types";

const { baseUrl, endpoints } = config.n8n;
const { baseUrl: liveBaseUrl, endpoints: liveEndpoints } = config.live;

/**
 * Gets phones assigned to a tecnico
 * Nota: Sin cache buster - SWR maneja la invalidación de cache
 */
export async function getPhonesByTecnico(tecnicoNombre: string, forceRefresh = false): Promise<ApiResponse<Phone[]>> {
  try {
    const url = `${liveBaseUrl}${liveEndpoints.getPhones}?tecnico=${encodeURIComponent(tecnicoNombre)}${forceRefresh ? '&refresh=1' : ''}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { "X-Requested-With": "mrapple" },
    });

    // Check for auth errors
    if (response.status === 401) {
      return { success: false, error: "Sesión expirada" };
    }

    const data = await response.json();

    // El workflow devuelve un array directo de telefonos
    if (Array.isArray(data)) {
      return { success: true, data };
    }

    // Si hay error, viene como objeto { error: "..." }
    return { success: false, error: data.error || "Error al obtener teléfonos" };
  } catch (error) {
    console.error("Get phones error:", error);
    return { success: false, error: "Error de conexión" };
  }
}

/**
 * Gets active technicians via API (session required)
 */
export async function fetchTecnicosActivos(): Promise<string[]> {
  try {
    const response = await fetch('/api/tecnicos/activos', {
      credentials: 'include',
      headers: {
        'X-Requested-With': 'mrapple',
      },
    });

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((t: { nombre: string }) => t.nombre);
    }

    return [];
  } catch (error) {
    console.error("Fetch tecnicos error:", error);
    return [];
  }
}

/**
 * Generates a unique request ID for idempotency
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Transfers a phone to another tecnico
 */
export async function transferPhone(payload: TransferPayload): Promise<ApiResponse<{ item_id: string }>> {
  try {
    const formData = new FormData();
    formData.append("item_id", payload.item_id);
    formData.append("tecnico_actual", payload.tecnico_actual);
    formData.append("tecnico_actual_nombre", payload.tecnico_actual_nombre);
    formData.append("request_id", generateRequestId()); // Idempotency key

    if (payload.nuevo_tecnico) {
      formData.append("nuevo_tecnico", payload.nuevo_tecnico);
    }

    if (payload.comentario) {
      formData.append("comentario", payload.comentario);
    }

    if (payload.foto) {
      // Compress image before upload (reduces size by ~70%)
      const compressedFoto = await compressImageForUpload(payload.foto);
      if (compressedFoto) {
        formData.append("foto", compressedFoto);
      }
    }

    const response = await fetch(`${baseUrl}${endpoints.transfer}`, {
      method: "POST",
      headers: { "X-Requested-With": "mrapple" },
      credentials: "include",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: { item_id: data.item_id } };
    }

    return { success: false, error: data.error || "Error al transferir" };
  } catch (error) {
    console.error("Transfer error:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export interface TecnicoWithPhones {
  nombre: string;
  phones: Phone[];
  phonesCount?: number;
  error?: string;
}

export async function fetchAllTecnicosWithPhones(): Promise<TecnicoWithPhones[]> {
  // Use resumen for technician names, but always fetch actual phones per-technician
  // (resumen phonesCount can be stale when items are in shared groups like "Reparaciones Generales")
  const resumen = await getEquipoResumen();

  const tecnicos = (resumen.success && resumen.data && resumen.data.length > 0)
    ? resumen.data.map(r => r.tecnico)
    : await fetchTecnicosActivos();

  const results = await Promise.all(
    tecnicos.map(async (nombre) => {
      const response = await getPhonesByTecnico(nombre);
      return {
        nombre,
        phones: response.success ? (response.data ?? []) : [],
        phonesCount: response.success ? (response.data?.length ?? 0) : 0,
        error: response.success ? undefined : response.error,
      };
    })
  );
  return results.sort((a, b) => (b.phonesCount ?? b.phones.length) - (a.phonesCount ?? a.phones.length));
}

/**
 * Gets reparaciones de clientes asignadas a un tecnico
 */
export async function getReparacionesCliente(tecnico: string, forceRefresh = false): Promise<ApiResponse<ReparacionCliente[]>> {
  try {
    const url = `${liveBaseUrl}${liveEndpoints.reparaciones}?tecnico=${encodeURIComponent(tecnico)}${forceRefresh ? '&refresh=1' : ''}`;
    const response = await fetch(url, {
      credentials: "include",
      headers: { "X-Requested-With": "mrapple" },
    });

    // Check for auth errors
    if (response.status === 401) {
      return { success: false, error: "Sesión expirada" };
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    return { success: false, error: data.error || "Error al obtener reparaciones" };
  } catch (error) {
    console.error("Get reparaciones error:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export interface EquipoResumen {
  tecnico: string;
  phonesCount: number;
  repairsCount: number;
  updatedAt: string | null;
}

export async function getEquipoResumen(): Promise<ApiResponse<EquipoResumen[]>> {
  try {
    const response = await fetch(`${liveBaseUrl}${liveEndpoints.equipoResumen}`, {
      credentials: "include",
      headers: { "X-Requested-With": "mrapple" },
    });

    if (response.status === 401) {
      return { success: false, error: "Sesión expirada" };
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    return { success: false, error: data.error || "Error al obtener resumen de equipo" };
  } catch (error) {
    console.error("Get equipo resumen error:", error);
    return { success: false, error: "Error de conexión" };
  }
}

/**
 * Cambia el estado de una reparación y guarda log para métricas
 */
export async function cambiarEstadoReparacion(
  reparacion: ReparacionCliente,
  nuevoEstado: string,
  tecnicoNombre: string
): Promise<ApiResponse<{ item_id: string }>> {
  try {
    const url = `${baseUrl}${endpoints.cambiarEstado}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "mrapple",
      },
      credentials: "include",
      body: JSON.stringify({
        request_id: generateRequestId(), // Idempotency key
        item_id: reparacion.id,
        nuevo_estado: nuevoEstado,
        tecnico_nombre: tecnicoNombre,
        item_nombre: reparacion.nombre,
        tipo_reparacion: reparacion.tipo_reparacion,
        cliente_nombre: `${reparacion.cliente_nombre} ${reparacion.cliente_apellido}`.trim(),
        cliente_telefono: reparacion.cliente_telefono,
        imei: reparacion.imei,
        valor: reparacion.valor,
        estado_anterior: reparacion.estado,
      }),
    });
    const data = await response.json();
    return data.success ? { success: true, data } : { success: false, error: data.error };
  } catch (error) {
    console.error("Cambiar estado error:", error);
    return { success: false, error: "Error de conexión" };
  }
}

/**
 * Transfiere una reparación de cliente a otro técnico
 */
export async function transferirReparacion(payload: {
  item_id: string;
  tecnico_actual: string;
  tecnico_actual_nombre: string;
  nuevo_tecnico?: string;
  comentario?: string;
  foto?: File | null;
}): Promise<ApiResponse<{ item_id: string }>> {
  try {
    const formData = new FormData();
    formData.append("item_id", payload.item_id);
    formData.append("tecnico_actual", payload.tecnico_actual);
    formData.append("tecnico_actual_nombre", payload.tecnico_actual_nombre);
    formData.append("request_id", generateRequestId()); // Idempotency key

    if (payload.nuevo_tecnico) {
      formData.append("nuevo_tecnico", payload.nuevo_tecnico);
    }
    if (payload.comentario) {
      formData.append("comentario", payload.comentario);
    }
    if (payload.foto) {
      // Compress image before upload (reduces size by ~70%)
      const compressedFoto = await compressImageForUpload(payload.foto);
      if (compressedFoto) {
        formData.append("foto", compressedFoto);
      }
    }

    const response = await fetch(`${baseUrl}${endpoints.transferirReparacion}`, {
      method: "POST",
      headers: { "X-Requested-With": "mrapple" },
      credentials: "include",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: { item_id: data.item_id } };
    }

    return { success: false, error: data.error || "Error al transferir reparación" };
  } catch (error) {
    console.error("Transfer reparacion error:", error);
    return { success: false, error: "Error de conexión" };
  }
}
