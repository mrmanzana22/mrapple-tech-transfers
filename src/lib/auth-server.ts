// Server-side auth utilities for API routes
// Pattern: FULLEMPAQUES hardening adapted for MrApple

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from './supabase-server';

const COOKIE_NAME = 'mr_session';
const IS_PROD = process.env.NODE_ENV === 'production';

export interface TecnicoSession {
  tecnico_id: string;
  nombre: string;
  rol: string;
  puede_ver_equipo: boolean;
}

// ============================================
// COOKIE HELPERS
// ============================================

export function getSessionCookie(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

export function createSessionCookie(sessionId: string, maxAgeHours: number = 8): string {
  const maxAge = maxAgeHours * 60 * 60;
  const secure = IS_PROD ? 'Secure;' : '';
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; ${secure} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  const secure = IS_PROD ? 'Secure;' : '';
  return `${COOKIE_NAME}=; HttpOnly; ${secure} SameSite=Lax; Path=/; Max-Age=0`;
}

// ============================================
// SESSION VALIDATION
// ============================================

export async function validateSession(
  request: NextRequest
): Promise<TecnicoSession | null> {
  const sessionId = getSessionCookie(request);
  if (!sessionId) return null;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) return null;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || null;

  try {
    const { data, error } = await supabaseServer.rpc('mrapple_validate_tecnico_session', {
      p_session_id: sessionId,
      p_ip: ip,
      p_user_agent: userAgent,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      tecnico_id: row.tecnico_id,
      nombre: row.nombre,
      rol: row.rol,
      puede_ver_equipo: row.puede_ver_equipo,
    };
  } catch {
    return null;
  }
}

// ============================================
// MIDDLEWARE HELPERS
// ============================================

export async function requireTecnicoSession(
  request: NextRequest
): Promise<{ session: TecnicoSession } | { error: NextResponse }> {
  const session = await validateSession(request);

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', error: 'Sesión inválida o expirada' },
        { status: 401 }
      ),
    };
  }

  return { session };
}

export function requireRole(
  session: TecnicoSession,
  allowedRoles: string[]
): NextResponse | null {
  if (!allowedRoles.includes(session.rol)) {
    return NextResponse.json(
      { success: false, code: 'FORBIDDEN', error: 'No tienes permiso para esta acción' },
      { status: 403 }
    );
  }
  return null;
}

export function requirePermiso(
  session: TecnicoSession,
  permiso: keyof Pick<TecnicoSession, 'puede_ver_equipo'>
): NextResponse | null {
  if (!session[permiso]) {
    return NextResponse.json(
      { success: false, code: 'FORBIDDEN', error: 'No tienes este permiso' },
      { status: 403 }
    );
  }
  return null;
}

// ============================================
// CSRF PROTECTION (light)
// ============================================

export function validateCsrf(request: NextRequest): boolean {
  // All POST/PUT/DELETE must have X-Requested-With header
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const xRequestedWith = request.headers.get('x-requested-with');
    return xRequestedWith === 'mrapple';
  }
  return true;
}

export function csrfError(): NextResponse {
  return NextResponse.json(
    { success: false, code: 'CSRF_FAILED', error: 'Invalid request' },
    { status: 403 }
  );
}

// ============================================
// IP HELPER
// ============================================

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
