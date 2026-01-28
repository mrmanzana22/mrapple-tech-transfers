# MrApple Tech Transfers

Sistema de gestión de transferencias de teléfonos y reparaciones para técnicos de MrApple.

## Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (PostgreSQL), n8n (workflows)
- **Integrations**: Monday.com (inventory), Web Push notifications

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# Supabase (server-side only)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# n8n
N8N_WEBHOOK_BASE=

# Monday.com
MONDAY_API_TOKEN=

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
PUSH_API_SECRET=
```

---

## Seguridad (Hardening v1)

### Principios

- El frontend **NO** habla directo con Supabase/Monday
- Todo pasa por API Routes con:
  - Cookie httpOnly (sesión server-side)
  - Validación de rol/permisos
  - Header CSRF obligatorio: `X-Requested-With: mrapple`
- Acciones críticas usan idempotency (`request_id`) para evitar duplicados

### Autenticación

- Login por PIN vía `/api/auth/login` (RPC server-side con bcrypt)
- Sesión: cookie `mr_session` (HttpOnly, Secure en prod, SameSite=Lax)
- Endpoints protegidos responden:
  - `401 NO_SESSION` si no hay sesión válida
  - `403 FORBIDDEN` si no tiene rol requerido

### Ownership (Fase 2)

Para operaciones POST sobre items de Monday:

- Se valida server-side que el técnico logueado sea el owner actual del item
- Si no es owner: `403 NOT_OWNER`
- El rol `jefe` o `puede_ver_equipo=true` puede **ver** todo, pero NO puede transferir/cambiar estado si no es owner

### Idempotency (anti doble-click)

Flujo:
1. Frontend genera `request_id` (UUID) por cada acción crítica
2. API hace `claim(request_id)`:
   - Si ya `succeeded`: devuelve respuesta cacheada
   - Si `processing`: devuelve `409 DUPLICATE`
   - Si nuevo: procesa normal
3. Al terminar: `mark_succeeded` o `mark_failed`

Tablas con `request_id`:
- `mrapple_transfer_logs`
- `mrapple_reparacion_logs`
- `mrapple_idempotency` (TTL 7 días)

### Checklist de pruebas

| Test | Esperado |
|------|----------|
| Doble click transferir | 1 log, segundo devuelve cached |
| Refresh mientras procesa | 409 o cached, nunca duplica |
| Logout + navegar a /tecnico | 401, redirect a login |
| Jefe transfiriendo item de otro | 403 NOT_OWNER |
| `puede_ver_equipo=true` | Acceso a pestaña Equipo |

---

## Arquitectura

```
Frontend (React)
    ↓ fetch + cookie + CSRF header
API Routes (/api/*)
    ↓ validates session + ownership + idempotency
    ↓
┌───────────────┬──────────────────┐
│   Supabase    │       n8n        │
│  (sessions,   │   (Monday ops,   │
│   logs, auth) │   file uploads)  │
└───────────────┴──────────────────┘
```

## Deploy

Desplegado en Vercel. Push a `main` triggerea deploy automático.
