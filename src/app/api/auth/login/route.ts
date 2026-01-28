// POST /api/auth/login
// Validates PIN via RPC, creates server-side session, sets httpOnly cookie

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createSessionCookie, getClientIp, validateCsrf, csrfError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  // CSRF check
  if (!validateCsrf(request)) {
    return csrfError();
  }

  try {
    const body = await request.json();
    const { pin } = body;

    // Validate input
    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', error: 'PIN inválido' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || null;

    // Call login RPC (handles rate limiting + bcrypt validation)
    const { data: loginResult, error: loginError } = await supabaseServer.rpc('mrapple_tecnico_login', {
      p_pin: pin,
      p_ip: ip,
    });

    if (loginError) {
      console.error('Login RPC error:', loginError);
      return NextResponse.json(
        { success: false, code: 'SERVER_ERROR', error: 'Error de servidor' },
        { status: 500 }
      );
    }

    // Check login result
    if (!loginResult.success) {
      const status = loginResult.code === 'RATE_LIMIT' ? 429 : 401;
      return NextResponse.json(
        {
          success: false,
          code: loginResult.code,
          error: loginResult.error,
          blocked: loginResult.blocked || false,
        },
        { status }
      );
    }

    // Login successful - create server-side session
    const tecnico = loginResult.tecnico;

    const { data: sessionId, error: sessionError } = await supabaseServer.rpc('mrapple_create_tecnico_session', {
      p_tecnico_id: tecnico.id,
      p_ip: ip,
      p_user_agent: userAgent,
      p_duration_hours: 8,
    });

    if (sessionError || !sessionId) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { success: false, code: 'SESSION_ERROR', error: 'Error al crear sesión' },
        { status: 500 }
      );
    }

    // Build response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      tecnico: {
        id: tecnico.id,
        nombre: tecnico.nombre,
        rol: tecnico.rol,
        puede_ver_equipo: tecnico.puede_ver_equipo,
      },
    });

    response.headers.set('Set-Cookie', createSessionCookie(sessionId, 8));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', error: 'Error de servidor' },
      { status: 500 }
    );
  }
}
