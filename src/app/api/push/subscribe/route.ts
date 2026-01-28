// POST /api/push/subscribe
// Saves push subscription for a technician
// Uses service role key (server-side)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { validateSession, validateCsrf, csrfError } from '@/lib/auth-server';
import { addCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  // CSRF check
  if (!validateCsrf(request)) {
    return addCorsHeaders(csrfError(), request);
  }

  // Session check
  const session = await validateSession(request);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: 'NO_SESSION', error: 'No autenticado' },
      { status: 401 }
    );
    return addCorsHeaders(res, request);
  }

  try {
    const { subscription } = await request.json();

    if (!subscription) {
      const res = NextResponse.json(
        { success: false, code: 'BAD_REQUEST', error: 'Missing subscription' },
        { status: 400 }
      );
      return addCorsHeaders(res, request);
    }

    const supabase = getSupabaseServer();

    // Use session.nombre as tecnico_nombre (don't trust client)
    const { error } = await supabase
      .from('mrapple_push_subscriptions')
      .upsert({
        tecnico_nombre: session.nombre,
        subscription,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tecnico_nombre'
      });

    if (error) {
      console.error('Supabase error:', error);
      const res = NextResponse.json(
        { success: false, code: 'DB_ERROR', error: error.message },
        { status: 500 }
      );
      return addCorsHeaders(res, request);
    }

    const res = NextResponse.json({ success: true });
    return addCorsHeaders(res, request);
  } catch (error) {
    console.error('Subscribe error:', error);
    const res = NextResponse.json(
      { success: false, code: 'SERVER_ERROR', error: 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}
