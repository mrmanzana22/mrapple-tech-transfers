# Supabase - Base de Datos

Documentación del schema de Supabase para Mister Manzana.

**Project ID:** mhvzpetucfdjkvutmpen
**URL:** https://mhvzpetucfdjkvutmpen.supabase.co

---

## Tablas

### mrapple_repair_approvals

Almacena solicitudes de aprobación de reparaciones.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| item_id | TEXT | ID del item en Monday |
| tecnico_monday_label | TEXT | Label del técnico asignado |
| cliente_nombre | TEXT | Nombre completo del cliente |
| cliente_telefono | TEXT | WhatsApp del cliente |
| tipo_reparacion | TEXT | Descripción de la reparación |
| serial_imei | TEXT | IMEI o serial del equipo |
| valor_a_cobrar | NUMERIC | Precio de la reparación |
| reparado_a | TEXT | Destino (clientes/telefonos) |
| status | TEXT | pending, approved, rejected |
| requested_at | TIMESTAMPTZ | Fecha de solicitud |
| decided_at | TIMESTAMPTZ | Fecha de decisión |
| decided_via | TEXT | web, whatsapp, phone, verbal |
| decided_by | TEXT | Quién tomó la decisión |
| token_hash | TEXT | Hash SHA-256 del token |
| token_expires_at | TIMESTAMPTZ | Expiración del token (48h) |
| last_reminder_at | TIMESTAMPTZ | Último recordatorio enviado |
| reminders_count | INTEGER | Cantidad de recordatorios |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |

**Índices:**
- PRIMARY KEY: id
- UNIQUE: item_id

---

### mrapple_payment_flows

Almacena flujos de pago y validación de comprobantes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| monday_item_id | TEXT | ID del item en Monday |
| client_phone | TEXT | WhatsApp del cliente (con código país) |
| estado | TEXT | Estado del flujo |
| receipt_url | TEXT | URL del comprobante en Storage |
| valor | NUMERIC | Valor a pagar |
| cliente_nombre | TEXT | Nombre del cliente |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |
| validated_by | TEXT | Quién validó (guille) |
| validated_by_phone | TEXT | Teléfono del validador |
| validated_at | TIMESTAMPTZ | Fecha de validación |
| validation_status | TEXT | pending, approved, rejected |
| rejection_reason | TEXT | Razón del rechazo |
| reminder_sent_at | TIMESTAMPTZ | Último recordatorio a Guille |

**Estados del flujo (estado):**
- `pending_payment` - Esperando que cliente pague
- `awaiting_receipt` - Esperando comprobante
- `receipt_received` - Comprobante recibido, esperando validación
- `validated` - Pago confirmado

**Estados de validación (validation_status):**
- `pending` - Sin validar
- `approved` - Guille aprobó
- `rejected` - Guille rechazó

---

### mrapple_repair_tracking

Tracking de heartbeats para reparaciones prolongadas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| item_id | TEXT | Primary key, ID del item en Monday |
| last_heartbeat_at | TIMESTAMPTZ | Último heartbeat enviado |
| created_at | TIMESTAMPTZ | Fecha de creación |

---

## Funciones RPC

### mrapple_decide_repair_approval

Procesa la decisión del cliente (aprobar/rechazar).

```sql
mrapple_decide_repair_approval(
  p_item_id TEXT,
  p_token TEXT,
  p_decision TEXT,  -- 'approved' o 'rejected'
  p_via TEXT        -- 'web', 'whatsapp', etc.
)
```

**Retorna:** Registro actualizado o vacío si token inválido.

---

### mrapple_set_payment_receipt

Guarda el comprobante de pago enviado por el cliente.

```sql
CREATE OR REPLACE FUNCTION public.mrapple_set_payment_receipt(
  p_item_id TEXT,
  p_phone TEXT,
  p_receipt_url TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE mrapple_payment_flows
  SET
    estado = 'receipt_received',
    receipt_url = p_receipt_url,
    validation_status = 'pending',  -- Resetea para re-envíos
    updated_at = now()
  WHERE monday_item_id = p_item_id
    AND client_phone = p_phone;
END;
$function$;
```

**Nota:** El `validation_status = 'pending'` es importante para permitir re-envío de comprobantes después de un rechazo.

---

### mrapple_log_repair_event

Registra eventos del flujo de reparación para auditoría.

```sql
mrapple_log_repair_event(
  p_item_id TEXT,
  p_type TEXT,      -- 'APPROVED', 'REJECTED', etc.
  p_payload JSONB   -- Datos adicionales
)
```

---

## Storage

### Bucket: payment-receipts

Almacena comprobantes de pago.

**Path:** `{item_id}/{timestamp}.{ext}`

**Políticas:**
- Lectura: Autenticado
- Escritura: Service role

---

## Queries Comunes

### Buscar aprobación por item
```sql
SELECT * FROM mrapple_repair_approvals
WHERE item_id = '11127160404';
```

### Buscar payment flow por teléfono
```sql
SELECT * FROM mrapple_payment_flows
WHERE client_phone LIKE '%3017428749%'
ORDER BY created_at DESC;
```

### Payment flows pendientes de validación
```sql
SELECT * FROM mrapple_payment_flows
WHERE estado = 'receipt_received'
  AND validation_status = 'pending';
```

### Items sin heartbeat en 4+ horas
```sql
SELECT pf.*
FROM mrapple_payment_flows pf
LEFT JOIN mrapple_repair_tracking rt ON pf.monday_item_id = rt.item_id
WHERE pf.estado = 'receipt_received'
  AND (rt.last_heartbeat_at IS NULL
       OR rt.last_heartbeat_at < NOW() - INTERVAL '4 hours');
```

---

## Migraciones Importantes

### 2026-01-29: Agregar campos de validación
```sql
ALTER TABLE mrapple_payment_flows
  ADD COLUMN IF NOT EXISTS validated_by TEXT,
  ADD COLUMN IF NOT EXISTS validated_by_phone TEXT,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
```

### 2026-01-29: Crear tabla de tracking
```sql
CREATE TABLE IF NOT EXISTS mrapple_repair_tracking (
  item_id TEXT PRIMARY KEY,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2026-01-30: Fix función set_payment_receipt
```sql
-- Agregar reset de validation_status para permitir re-envíos
CREATE OR REPLACE FUNCTION public.mrapple_set_payment_receipt(...)
-- Ver definición completa arriba
```

---

## Troubleshooting

### "No encontramos reparación con tu número"
1. Verificar que `client_phone` tenga código de país (57...)
2. Verificar `estado` sea `awaiting_receipt` o `receipt_received` con `validation_status = pending`
3. Revisar si el payment_flow existe para ese item

### Payment flow no se crea
1. Verificar que el status en Monday cambió a 7 (Por entregar - Pagar)
2. Revisar ejecución del workflow en n8n
3. Confirmar que el cliente tiene teléfono válido en Monday

### Comprobante no llega a Guille
1. Verificar que la imagen se guardó en Storage
2. Revisar logs del workflow repair-approval-whatsapp-response
3. Confirmar que el número de Guille es correcto (573175530069)
