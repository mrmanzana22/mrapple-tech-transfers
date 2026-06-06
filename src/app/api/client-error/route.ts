// POST /api/client-error
// Telemetría ligera: registra errores del cliente en mrapple_error_logs para
// que el equipo tenga visibilidad (hoy los fallos solo iban a console.error y
// nadie se enteraba). Inserta con service role (RLS bloquea anon).
//
// Filosofía: este endpoint NUNCA debe romper nada ni propagar errores. Si algo
// falla acá, se traga el error y responde success:false silenciosamente.

import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const str = (v: unknown, max: number): string | null => {
      if (v == null) return null;
      const s = String(v).trim();
      return s ? s.slice(0, max) : null;
    };

    const contexto = str(body.contexto, 200) || "desconocido";
    const mensaje = str(body.mensaje, 2000) || "Sin mensaje";
    const stack = str(body.stack, 8000);
    const item_id = str(body.item_id, 100);
    const tecnico = str(body.tecnico, 120);
    const url = str(body.url, 500);
    const user_agent = req.headers.get("user-agent")?.slice(0, 500) || null;

    const supabase = getSupabaseServer();
    await supabase.from("mrapple_error_logs").insert({
      contexto,
      mensaje,
      stack,
      item_id,
      tecnico,
      url,
      user_agent,
    });

    const res = NextResponse.json({ success: true });
    return addCorsHeaders(res, req);
  } catch {
    // El logging de errores jamás debe causar otro error visible.
    const res = NextResponse.json({ success: false });
    return addCorsHeaders(res, req);
  }
}
