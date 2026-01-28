// API calls to n8n webhooks and Supabase

import { config } from "./config";
import type { Tecnico, Phone, TransferPayload, ApiResponse, ReparacionCliente } from "@/types";

const { baseUrl, endpoints } = config.n8n;
const SUPABASE_URL = config.supabase.url;
const SUPABASE_ANON_KEY = config.supabase.anonKey;

/**
 * Validates PIN and returns tecnico data (direct Supabase call)
 */
export async function loginWithPin(pin: string): Promise<ApiResponse<Tecnico>> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${config.supabase.tableTecnicos}?pin=eq.${pin}&activo=eq.true&select=*`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return { success: true, data: data[0] as Tecnico };
    }

    return { success: false, error: "PIN incorrecto o usuario inactivo" };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Error de conexión" };
  }
}

/**
 * Gets phones assigned to a tecnico
 * Nota: Sin cache buster - SWR maneja la invalidación de cache
 */
export async function getPhonesByTecnico(tecnicoNombre: string): Promise<ApiResponse<Phone[]>> {
  try {
    const url = `${baseUrl}${endpoints.getPhones}?tecnico=${encodeURIComponent(tecnicoNombre)}`;

    const response = await fetch(url, {
      method: "GET",
    });

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
 * Gets active technicians from Supabase (dynamic, not hardcoded)
 */
export async function fetchTecnicosActivos(): Promise<string[]> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${config.supabase.tableTecnicos}?rol=eq.tecnico&activo=eq.true&select=nombre`;

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((t: { nombre: string }) => t.nombre);
    }

    return [];
  } catch (error) {
    console.error("Fetch tecnicos error:", error);
    return [];
  }
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

    if (payload.nuevo_tecnico) {
      formData.append("nuevo_tecnico", payload.nuevo_tecnico);
    }

    if (payload.comentario) {
      formData.append("comentario", payload.comentario);
    }

    if (payload.foto) {
      formData.append("foto", payload.foto);
    }

    const response = await fetch(`${baseUrl}${endpoints.transfer}`, {
      method: "POST",
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
  error?: string;
}

export async function fetchAllTecnicosWithPhones(): Promise<TecnicoWithPhones[]> {
  const tecnicos = await fetchTecnicosActivos();
  const results = await Promise.all(
    tecnicos.map(async (nombre) => {
      const response = await getPhonesByTecnico(nombre);
      return {
        nombre,
        phones: response.success ? (response.data ?? []) : [],
        error: response.success ? undefined : response.error,
      };
    })
  );
  return results.sort((a, b) => b.phones.length - a.phones.length);
}

/**
 * Gets reparaciones de clientes asignadas a un tecnico
 */
export async function getReparacionesCliente(tecnico: string): Promise<ApiResponse<ReparacionCliente[]>> {
  try {
    const url = `${baseUrl}${endpoints.reparaciones}?tecnico=${encodeURIComponent(tecnico)}`;
    const response = await fetch(url);
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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

    if (payload.nuevo_tecnico) {
      formData.append("nuevo_tecnico", payload.nuevo_tecnico);
    }
    if (payload.comentario) {
      formData.append("comentario", payload.comentario);
    }
    if (payload.foto) {
      formData.append("foto", payload.foto);
    }

    const response = await fetch(`${baseUrl}${endpoints.transferirReparacion}`, {
      method: "POST",
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
