# Guía de Prueba - Flujo de Notificaciones Cliente

Este documento describe el paso a paso para probar el flujo completo de notificaciones WhatsApp al cliente.

---

## Prerequisitos

### IDs y URLs importantes

| Recurso | Valor |
|---------|-------|
| Board Monday | `324982306` |
| n8n URL | https://appn8n-n8n.lx6zon.easypanel.host |
| Supabase Project | `mhvzpetucfdjkvutmpen` |
| Evolution Instance | `tecnicos` |

### Workflows involucrados

| Workflow | ID | Función |
|----------|-----|---------|
| repair-status-notify | `Yi3QA20FA3acUjCY` | Notifica cambios de estado |
| repair-approval-whatsapp-response | `05qEkASGvqER6SES` | Procesa respuestas WhatsApp |

---

## Paso 1: Crear/Configurar Item de Prueba en Monday

### Campos requeridos

| Campo | Column ID | Valor de prueba |
|-------|-----------|-----------------|
| Nombre | `name` | "PRUEBA - iPhone 12 Pro" |
| Cliente nombre | `texto8` | Nombre real del tester |
| Cliente apellido | `texto9` | Apellido real del tester |
| Teléfono | `tel_fono` | Número WhatsApp del tester (con código país) |
| Tipo reparación | `texto` | "Cambio de pantalla" |
| Valor a cobrar | `valor_a_cobrar` | 90000 |
| Serial/IMEI | `texto03` | "123456789012345" |

**IMPORTANTE:** El teléfono debe ser el número real de WhatsApp del tester, con código de país (ej: `17864898408` para USA, `573001234567` para Colombia).

---

## Paso 2: Probar Flujo de Estados

### 2.1 Estado: En oficina Local (index 8)

1. Cambiar estado a "En oficina Local"
2. **Verificar:** Cliente recibe WhatsApp:
   ```
   Hola {nombre} 👋
   📍 Tu equipo llegó a nuestra oficina. Ya lo registramos ✅
   📍 *Mister Manzana*
   ```

### 2.2 Estado: Revisión previa (index 106)

- Se activa automáticamente 20 minutos después del estado 8
- O cambiar manualmente para prueba
- **Verificar:** Cliente recibe notificación de revisión

### 2.3 Estado: en cotización 2P (index 14)

1. Cambiar estado a "en cotización 2P"
2. **Verificar:** Cliente recibe mensaje con link de aprobación:
   ```
   Responde:
   1 = Aprobar ✅
   2 = No aprobar

   O entra aquí:
   https://mrapple-tech-transfers.vercel.app/r/{item_id}?t={token}
   ```
3. **Verificar en Supabase:** Se creó registro en `mrapple_repair_approvals`

### 2.4 Aprobación del Cliente

**Por WhatsApp:**
- Cliente responde "1" para aprobar
- Cliente responde "2" para rechazar

**Por Link:**
- Cliente entra al link y selecciona opción

**Verificar después de aprobar:**
- Estado en Monday cambia a "En reparación" (index 12)
- Cliente recibe confirmación

**Verificar después de rechazar:**
- Estado en Monday cambia a "POR ENTREGAR" (index 19)
- Cliente recibe notificación

---

## Paso 3: Verificar Ejecuciones n8n

### Ver ejecuciones del workflow de notificaciones

```bash
# En n8n MCP
n8n_executions(action="list", workflowId="Yi3QA20FA3acUjCY", limit=10)
```

### Ver detalle de ejecución específica

```bash
n8n_executions(action="get", id="{execution_id}", mode="summary")
```

---

## Troubleshooting

### Problema: "No encontramos una reparación pendiente con tu número"

**Causa:** El teléfono del cliente no coincide con el registrado en Supabase.

**Verificar:**
```sql
SELECT item_id, cliente_telefono, cliente_nombre, status 
FROM mrapple_repair_approvals 
WHERE item_id = '{item_id}';
```

**Solución:**
```sql
UPDATE mrapple_repair_approvals 
SET cliente_telefono = '{telefono_correcto}'
WHERE item_id = '{item_id}'
  AND status = 'pending';
```

### Problema: Mensaje queda en PENDING y no llega

**Verificar conexión Evolution:**
```bash
curl -X GET "https://evolutionapi-evolution-api.lx6zon.easypanel.host/instance/connectionState/tecnicos" \
  -H "apikey: 818CABBF7AAD-43EA-895E-9E9382255F46"
```

**Verificar si número tiene WhatsApp:**
```bash
curl -X POST "https://evolutionapi-evolution-api.lx6zon.easypanel.host/chat/whatsappNumbers/tecnicos" \
  -H "apikey: 818CABBF7AAD-43EA-895E-9E9382255F46" \
  -H "Content-Type: application/json" \
  -d '{"numbers": ["{telefono}"]}'
```

**Verificar estado real del mensaje:**
```bash
curl -X POST "https://evolutionapi-evolution-api.lx6zon.easypanel.host/chat/findMessages/tecnicos" \
  -H "apikey: 818CABBF7AAD-43EA-895E-9E9382255F46" \
  -H "Content-Type: application/json" \
  -d '{"where": {"key": {"fromMe": true}}, "limit": 5}'
```

Buscar `"MessageUpdate":[{"status":"DELIVERY_ACK"}]` = mensaje entregado.

### Problema: Status en Supabase ya es "approved"

El registro ya fue procesado. Opciones:

**Opción 1: Resetear registro**
```sql
UPDATE mrapple_repair_approvals 
SET status = 'pending',
    decided_at = NULL,
    decided_by = NULL,
    decided_via = NULL
WHERE item_id = '{item_id}';
```

**Opción 2: Generar nuevo registro**
Cambiar estado en Monday a cualquier otro, luego volver a "en cotización 2P" (index 14).

---

## Estructura de Tabla: mrapple_repair_approvals

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| item_id | text | ID del item en Monday |
| cliente_telefono | text | Teléfono WhatsApp (con código país) |
| cliente_nombre | text | Nombre completo |
| tipo_reparacion | text | Descripción del trabajo |
| valor_a_cobrar | numeric | Precio |
| status | text | pending, approved, rejected |
| token_hash | text | Token de autenticación |
| decided_at | timestamp | Fecha de decisión |
| decided_by | text | Quien decidió |
| decided_via | text | web o whatsapp |

---

## Flujo Completo de Estados

```
8  En oficina Local       → WhatsApp: "Tu equipo llegó"
        ↓ (auto 20 min)
106 Revisión previa       → WhatsApp: "Estamos revisando"
        ↓ (manual)
14  en cotización 2P      → WhatsApp: Link de aprobación
        ↓
   ┌────┴────┐
   ↓         ↓
APRUEBA   RECHAZA
   ↓         ↓
12  En reparación    19  POR ENTREGAR
   ↓
105 REPARADO         → WhatsApp: "Tu equipo está reparado"
   ↓
7  Por entregar-Pagar → WhatsApp: "Realiza el pago"
   ↓ (pago validado)
19  POR ENTREGAR      → WhatsApp: "Ya puedes recoger"
   ↓
107 ENTREGADO         → WhatsApp: "Gracias por confiar"
```

---

## Checklist de Prueba

- [ ] Item creado con teléfono correcto
- [ ] Estado 8 → Mensaje recibido
- [ ] Estado 14 → Link de aprobación recibido
- [ ] Registro creado en Supabase
- [ ] Respuesta "1" → Estado cambia a 12
- [ ] Respuesta "2" → Estado cambia a 19
- [ ] Estado 105 → Mensaje de reparado
- [ ] Estado 7 → Mensaje de pago
- [ ] Estado 19 → Mensaje de entrega lista
