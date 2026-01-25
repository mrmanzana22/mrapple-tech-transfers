// API calls to n8n webhooks and Supabase

import { config } from "./config";
import type { Tecnico, Phone, TransferPayload, ApiResponse } from "@/types";

const { baseUrl, endpoints } = config.n8n;
const SUPABASE_URL = config.supabase.url;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odnpwZXR1Y2Zkamt2dXRtcGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDI1MTgsImV4cCI6MjA4Mjg3ODUxOH0.PtUS0tuyXGUeKew2U-FxYIjfvaLsBByQYxxyONEcLOs";

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
