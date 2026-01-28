// GET /api/auth/verificar
// Validates session cookie and returns current tecnico data

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        code: 'NO_SESSION',
        error: 'No hay sesión activa',
      });
    }

    return NextResponse.json({
      success: true,
      tecnico: {
        id: session.tecnico_id,
        nombre: session.nombre,
        rol: session.rol,
        puede_ver_equipo: session.puede_ver_equipo,
      },
    });
  } catch (error) {
    console.error('Verificar session error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', error: 'Error de servidor' },
      { status: 500 }
    );
  }
}
