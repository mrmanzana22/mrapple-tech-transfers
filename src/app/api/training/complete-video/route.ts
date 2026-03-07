// POST /api/training/complete-video
// Marks a lesson video as watched, transitions to quiz_pendiente

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, validateCsrf, csrfError } from '@/lib/auth-server';
import { addCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { canAccessTraining, getLessonById } from '@/lib/training';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) return addCorsHeaders(csrfError(), request);

  const session = await validateSession(request);
  if (!session) {
    return addCorsHeaders(
      NextResponse.json({ success: false, code: 'NO_SESSION', error: 'No autenticado' }, { status: 401 }),
      request
    );
  }

  if (!canAccessTraining(session.nombre)) {
    return addCorsHeaders(
      NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'No tienes acceso' }, { status: 403 }),
      request
    );
  }

  try {
    const body = await request.json();
    const { leccion } = body;

    if (!leccion || !getLessonById(leccion)) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Lección inválida' }, { status: 400 }),
        request
      );
    }

    const supabase = getSupabaseServer();

    // Verify lesson is in video_pendiente state
    const { data: progress } = await supabase
      .from('mrapple_training_progress')
      .select('estado')
      .eq('tecnico_id', session.tecnico_id)
      .eq('leccion', leccion)
      .single();

    if (!progress || progress.estado !== 'video_pendiente') {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'El video ya fue completado o la lección está bloqueada' }, { status: 400 }),
        request
      );
    }

    // Update progress
    const { error } = await supabase
      .from('mrapple_training_progress')
      .update({
        video_completado: true,
        video_completado_at: new Date().toISOString(),
        estado: 'quiz_pendiente',
        updated_at: new Date().toISOString(),
      })
      .eq('tecnico_id', session.tecnico_id)
      .eq('leccion', leccion);

    if (error) {
      console.error('complete-video update error:', error);
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Error al actualizar progreso' }, { status: 500 }),
        request
      );
    }

    return addCorsHeaders(
      NextResponse.json({ success: true }),
      request
    );
  } catch (error) {
    console.error('complete-video error:', error);
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Error de servidor' }, { status: 500 }),
      request
    );
  }
}
