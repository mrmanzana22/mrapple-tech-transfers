# Live Snapshot (Rendimiento)

Esta capa acelera la app leyendo snapshots en Supabase en lugar de consultar Monday en tiempo real para cada carga de pantalla.

## Endpoints de lectura

- `GET /api/live/telefonos?tecnico=NAME`
- `GET /api/live/reparaciones?tecnico=NAME`
- `GET /api/live/equipo-resumen`

Headers de diagnóstico:

- `X-Data-Source: live | live-cache | n8n-fallback | stale-cache`
- `X-Cache: HIT | MISS | STALE`

## Endpoints de sync (para n8n)

- `POST /api/live/sync/full`
  - Body:
    - `phones: Phone[]`
    - `repairs: ReparacionCliente[]`
    - `sourceTs?: string`
- `POST /api/live/sync/item`
  - Body:
    - `type: "phone" | "repair"`
    - `payload: Phone | ReparacionCliente`
    - `sourceTs?: string`

Autenticación:

- Header `Authorization: Bearer $LIVE_SYNC_SECRET`
  o
- Header `x-live-sync-secret: $LIVE_SYNC_SECRET`

## Modo de operación recomendado

1. n8n corre refresh completo cada 30 segundos y llama `sync/full`.
2. n8n recibe eventos de Monday y llama `sync/item`.
3. App siempre lee de `/api/live/*`; si live falla, hace fallback a n8n y guarda snapshot.

## SQL

Ejecutar script: `docs/11-live-snapshot.sql`

