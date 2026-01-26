import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhvzpetucfdjkvutmpen.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Validar que viene de nuestra app (no es perfecto pero ayuda)
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://mrapple-tech-transfers.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/:\d+$/, '')))) {
      console.log('Rejected subscription from origin:', origin);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tecnico_nombre, subscription } = await request.json();

    if (!tecnico_nombre || !subscription) {
      return NextResponse.json(
        { error: 'Missing tecnico_nombre or subscription' },
        { status: 400 }
      );
    }

    // Validar que tecnico_nombre tiene formato esperado (no vacio, no muy largo)
    if (typeof tecnico_nombre !== 'string' || tecnico_nombre.length < 2 || tecnico_nombre.length > 100) {
      return NextResponse.json(
        { error: 'Invalid tecnico_nombre' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('mrapple_push_subscriptions')
      .upsert({
        tecnico_nombre,
        subscription,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tecnico_nombre'
      });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
