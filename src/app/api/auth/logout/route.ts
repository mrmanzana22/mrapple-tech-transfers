// POST /api/auth/logout
// Revokes server-side session and clears cookie

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getSessionCookie, clearSessionCookie, validateCsrf, csrfError } from '@/lib/auth-server';
import { handleCorsOptions, addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  // CSRF check
  if (!validateCsrf(request)) {
    return addCorsHeaders(csrfError(), request);
  }

  try {
    const sessionId = getSessionCookie(request);

    // Revoke session in DB if exists
    if (sessionId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(sessionId)) {
        await supabaseServer.rpc('mrapple_revoke_tecnico_session', {
          p_session_id: sessionId,
        });
      }
    }

    // Clear cookie regardless
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', clearSessionCookie());
    return addCorsHeaders(response, request);
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookie even on error
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', clearSessionCookie());
    return addCorsHeaders(response, request);
  }
}
