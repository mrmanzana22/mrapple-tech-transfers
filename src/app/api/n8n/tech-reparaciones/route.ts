// GET /api/n8n/tech-reparaciones
// Returns client repairs assigned to the authenticated technician
// Protected: requires valid session
// Role filtering: tecnico sees only their repairs, jefe can query any

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || "https://appn8n-n8n.lx6zon.easypanel.host/webhook";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  // Session check
  const session = await validateSession(request);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, request);
  }

  try {
    // Determine which tecnico to query
    let tecnicoQuery: string;

    if (session.rol === "jefe") {
      // Jefe can query any tecnico via query param
      const requestedTecnico = request.nextUrl.searchParams.get("tecnico");
      if (!requestedTecnico) {
        const res = NextResponse.json(
          { success: false, code: "BAD_REQUEST", error: "tecnico parameter required" },
          { status: 400 }
        );
        return addCorsHeaders(res, request);
      }
      tecnicoQuery = requestedTecnico;
    } else {
      // Tecnico can only see their own repairs - ignore client param
      tecnicoQuery = session.nombre;
    }

    // Forward to n8n
    const n8nUrl = `${N8N_BASE}/tech-reparaciones?tecnico=${encodeURIComponent(tecnicoQuery)}`;
    const n8nResponse = await fetch(n8nUrl);
    const data = await n8nResponse.json();

    // n8n returns array directly or { error: "..." }
    if (Array.isArray(data)) {
      const res = NextResponse.json(data);
      return addCorsHeaders(res, request);
    }

    const res = NextResponse.json(
      { success: false, error: data.error || "Error from n8n" },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  } catch (error) {
    console.error("tech-reparaciones error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}
