// GET /api/training/progress
// Returns training progress for the authenticated technician
// Initializes progress rows if they don't exist

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth-server';
import { addCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { canAccessTraining, getInitialProgressRows } from '@/lib/training';
import { getSupabaseServer } from '@/lib/supabase-server';
import { LESSONS } from '@/data/training/lessons';

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
      NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'No tienes acceso al entrenamiento' }, { status: 403 }),
      request
    );
  }

  try {
    const supabase = getSupabaseServer();

    // Fetch existing progress
    const { data: initialData, error } = await supabase
      .from('mrapple_training_progress')
      .select('leccion, estado, video_completado, video_completado_at, quiz_intentos, completada_at')
      .eq('tecnico_id', session.tecnico_id)
      .order('leccion');

    if (error) {
      console.error('training progress fetch error:', error);
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Error al obtener progreso' }, { status: 500 }),
        request
      );
    }

    let data = initialData;

    // Initialize if no progress exists
    if (!data || data.length === 0) {
      const rows = getInitialProgressRows(session.tecnico_id, session.nombre);

      const { error: insertError } = await supabase
        .from('mrapple_training_progress')
        .insert(rows);

      if (insertError) {
        console.error('training progress init error:', insertError);
        return addCorsHeaders(
          NextResponse.json({ success: false, error: 'Error al inicializar progreso' }, { status: 500 }),
          request
        );
      }

      // Re-fetch after init
      const refetch = await supabase
        .from('mrapple_training_progress')
        .select('leccion, estado, video_completado, video_completado_at, quiz_intentos, completada_at')
        .eq('tecnico_id', session.tecnico_id)
        .order('leccion');

      data = refetch.data || [];
    }

    // Enrich with lesson metadata
    const progress = (data || []).map(row => {
      const lesson = LESSONS.find(l => l.id === row.leccion);
      return {
        ...row,
        titulo: lesson?.title || row.leccion,
        descripcion: lesson?.description || '',
        orden: lesson?.order || 0,
      };
    }).sort((a, b) => a.orden - b.orden);

    return addCorsHeaders(
      NextResponse.json({ success: true, data: progress }),
      request
    );
  } catch (error) {
    console.error('training progress error:', error);
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Error de servidor' }, { status: 500 }),
      request
    );
  }
}
