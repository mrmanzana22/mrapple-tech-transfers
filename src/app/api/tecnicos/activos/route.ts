// GET /api/tecnicos/activos
// Returns list of active technicians for dropdown (session required)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { validateSession } from '@/lib/auth-server';
import { handleCorsOptions, addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  // Validate session
  const session = await validateSession(request);
  if (!session) {
    const response = NextResponse.json(
      { success: false, code: 'UNAUTHORIZED', error: 'Sesión inválida' },
      { status: 401 }
    );
    return addCorsHeaders(response, request);
  }

  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('mrapple_tecnicos')
      .select('id, nombre')
      .eq('activo', true)
      .eq('rol', 'tecnico')
      .order('nombre');

    if (error) {
      console.error('Fetch tecnicos error:', error);
      const response = NextResponse.json(
        { success: false, code: 'DB_ERROR', error: 'Error al obtener técnicos' },
        { status: 500 }
      );
      return addCorsHeaders(response, request);
    }

    const response = NextResponse.json({
      success: true,
      data: data || [],
    });
    return addCorsHeaders(response, request);
  } catch (error) {
    console.error('Tecnicos activos error:', error);
    const response = NextResponse.json(
      { success: false, code: 'SERVER_ERROR', error: 'Error de servidor' },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}
