// GET /api/auth/verificar
// Validates session cookie and returns current tecnico data

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth-server';
import { handleCorsOptions, addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession(request);

    if (!session) {
      const res = NextResponse.json({
        success: false,
        code: 'NO_SESSION',
        error: 'No hay sesión activa',
      });
      return addCorsHeaders(res, request);
    }

    const res = NextResponse.json({
      success: true,
      tecnico: {
        id: session.tecnico_id,
        nombre: session.nombre,
        rol: session.rol,
        puede_ver_equipo: session.puede_ver_equipo,
      },
    });
    return addCorsHeaders(res, request);
  } catch (error) {
    console.error('Verificar session error:', error);
    const res = NextResponse.json(
      { success: false, code: 'SERVER_ERROR', error: 'Error de servidor' },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}
