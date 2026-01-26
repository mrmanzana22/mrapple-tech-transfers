import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  'https://mhvzpetucfdjkvutmpen.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configurar VAPID (lazy initialization)
let vapidConfigured = false;
function configureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    'mailto:hare@mrapple.co',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

export async function POST(request: NextRequest) {
  // Validar API secret (solo n8n conoce este secret)
  const authHeader = request.headers.get('authorization');
  const expectedSecret = `Bearer ${process.env.PUSH_API_SECRET}`;

  if (!authHeader || authHeader !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  configureVapid();
  try {
    const { tecnico_nombre, title, body, url } = await request.json();

    if (!tecnico_nombre) {
      return NextResponse.json(
        { error: 'Missing tecnico_nombre' },
        { status: 400 }
      );
    }

    // Buscar suscripción del técnico
    const { data, error } = await supabase
      .from('mrapple_push_subscriptions')
      .select('subscription')
      .eq('tecnico_nombre', tecnico_nombre)
      .single();

    if (error || !data) {
      console.log('No subscription found for:', tecnico_nombre);
      return NextResponse.json(
        { error: 'No subscription found', tecnico: tecnico_nombre },
        { status: 404 }
      );
    }

    // Enviar notificación
    const payload = JSON.stringify({
      title: title || 'MrApple Tech',
      body: body || 'Tienes una nueva notificación',
      url: url || '/tecnico'
    });

    try {
      await webpush.sendNotification(data.subscription, payload);
      console.log('Push sent to:', tecnico_nombre);
      return NextResponse.json({ success: true, tecnico: tecnico_nombre });
    } catch (pushError: unknown) {
      const error = pushError as { statusCode?: number };
      console.error('Push error:', pushError);

      // Si la suscripción ya no es válida, eliminarla
      if (error.statusCode === 410) {
        await supabase
          .from('mrapple_push_subscriptions')
          .delete()
          .eq('tecnico_nombre', tecnico_nombre);

        return NextResponse.json(
          { error: 'Subscription expired and removed' },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to send push' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
