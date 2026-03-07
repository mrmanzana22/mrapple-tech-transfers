// GET /api/training/video-url?leccion=leccion-01
// Generates a signed URL for a lesson video from Supabase Storage

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth-server';
import { addCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { canAccessTraining, getLessonById } from '@/lib/training';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
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

  const leccion = request.nextUrl.searchParams.get('leccion');
  if (!leccion) {
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Parámetro leccion requerido' }, { status: 400 }),
      request
    );
  }

  const lesson = getLessonById(leccion);
  if (!lesson) {
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Lección no encontrada' }, { status: 404 }),
      request
    );
  }

  try {
    const supabase = getSupabaseServer();

    // Verify lesson is unlocked
    const { data: progress } = await supabase
      .from('mrapple_training_progress')
      .select('estado')
      .eq('tecnico_id', session.tecnico_id)
      .eq('leccion', leccion)
      .single();

    if (!progress || progress.estado === 'bloqueada') {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Lección bloqueada' }, { status: 403 }),
        request
      );
    }

    // Generate signed URL (1 hour)
    const { data: signedUrl, error } = await supabase.storage
      .from('training-videos')
      .createSignedUrl(lesson.videoPath, 3600);

    if (error || !signedUrl) {
      console.error('signed url error:', error);
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Video no disponible aún' }, { status: 404 }),
        request
      );
    }

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        data: { url: signedUrl.signedUrl, expires_in: 3600 },
      }),
      request
    );
  } catch (error) {
    console.error('video-url error:', error);
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Error de servidor' }, { status: 500 }),
      request
    );
  }
}
