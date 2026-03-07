-- =============================================
-- SETUP: Plataforma de Entrenamiento en Microsoldadura
-- Ejecutar en Supabase Dashboard → SQL Editor
-- =============================================

-- 1) Crear tabla de progreso
CREATE TABLE IF NOT EXISTS mrapple_training_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico_id TEXT NOT NULL,
  tecnico_nombre TEXT NOT NULL,
  leccion TEXT NOT NULL,
  video_completado BOOLEAN DEFAULT false,
  video_completado_at TIMESTAMPTZ,
  quiz_intentos JSONB DEFAULT '[]'::jsonb,
  estado TEXT DEFAULT 'bloqueada',
  completada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tecnico_id, leccion)
);

-- 2) Crear índice
CREATE INDEX IF NOT EXISTS idx_training_tecnico ON mrapple_training_progress(tecnico_id);

-- 3) Habilitar RLS (Row Level Security) pero permitir acceso con service_role
ALTER TABLE mrapple_training_progress ENABLE ROW LEVEL SECURITY;

-- Policy: service_role puede hacer todo (nuestras API routes usan service_role)
CREATE POLICY "Service role full access" ON mrapple_training_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4) Crear bucket de storage para videos (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', false)
ON CONFLICT (id) DO NOTHING;

-- 5) Verificación
SELECT 'Tabla creada' as status, count(*) as filas FROM mrapple_training_progress;
