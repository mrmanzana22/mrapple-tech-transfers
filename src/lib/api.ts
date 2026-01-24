// API calls to n8n webhooks

import { config } from "./config";
import type { Tecnico, Phone, TransferPayload, ApiResponse } from "@/types";

const { baseUrl, endpoints } = config.n8n;

/**
 * Validates PIN and returns tecnico data
 */
export async function loginWithPin(pin: string): Promise<ApiResponse<Tecnico>> {
  try {
    const response = await fetch(`${baseUrl}${endpoints.login}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin }),
    });

    const data = await response.json();

    if (data.success && data.tecnico) {
      return { success: true, data: data.tecnico };
    }

    return { success: false, error: data.error || "PIN incorrecto" };
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
    const url = new URL(`${baseUrl}${endpoints.getPhones}`);
    url.searchParams.set("tecnico", tecnicoNombre);

    const response = await fetch(url.toString(), {
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
