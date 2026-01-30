# Workflows n8n

Este documento lista todos los workflows de automatización en n8n para Mister Manzana.

**URL n8n:** https://appn8n-n8n.lx6zon.easypanel.host

---

## Workflows Activos

### repair-status-notify
**ID:** Yi3QA20FA3acUjCY

**Función:** Envía WhatsApp al cliente cuando cambia el estado en Monday.

**Trigger:** Webhook desde Monday (status change)

**Flujo:**
```
Monday Status Change → Map Data → Filter skipStatus → Send WhatsApp
```

**Estados que notifica:** 8, 106, 105, 2, 7, 19, 107, 102, 18, 0, 11, 17

**Estados que ignora (skipStatus):** 14, 12, 1, 3, 4, 5, 6, 9, 13, 15, 16, 101, 103, 104

---

### repair-approval-request
**ID:** (buscar en n8n)

**Función:** Envía link de aprobación cuando el item entra en cotización.

**Trigger:** Monday status change a 14

**Flujo:**
```
Status = 14 → Create Approval (Supabase) → Generate Token → Send WhatsApp with Link
```

**Output:** Cliente recibe link para aprobar/rechazar

---

### repair-approval-notify
**ID:** (buscar en n8n)

**Función:** Procesa la decisión del cliente cuando aprueba/rechaza desde el link web.

**Trigger:** Webhook desde la app web (POST /api/client/approval)

**Flujo:**
```
Webhook → Parse Decision → IF Approved?
  ├─ TRUE  → Monday status=12 + Assign JAFETH → Notify Client
  └─ FALSE → Monday status=19 → Notify Client
```

---

### repair-approval-whatsapp-response
**ID:** 05qEkASGvqER6SES

**Función:** Procesa respuestas del cliente por WhatsApp (aprobación y pagos).

**Trigger:** Webhook de Evolution API (mensajes entrantes)

**Flujos internos:**
1. **Aprobación:** Cliente responde al link → Actualiza Supabase → Cambia Monday
2. **Pago:** Cliente envía comprobante → Guarda en Storage → Notifica a Guille
3. **Validación Guille:** Guille responde 1/2 → Actualiza estado → Notifica cliente

---

### auto-revision-previa
**ID:** LbyFGxwOQVxczE3w

**Función:** Cambia automáticamente de "En oficina" a "Revisión previa" después de 20 minutos.

**Trigger:** Schedule cada 5 minutos

**Flujo:**
```
Schedule → Query Monday (status=8) → Filter (>20 min) → Change to status=106
```

---

### repair-heartbeat
**ID:** JtdrCgOkJXxvL1GT

**Función:** Envía mensaje de seguimiento a clientes con equipos en reparación prolongada.

**Trigger:** Schedule cada 30 minutos

**Flujo:**
```
Schedule → Check Business Hours (9-19 COL) → IF Yes:
  → Get Items (status=12)
  → Get Tracking (Supabase)
  → Filter (no heartbeat or >4h)
  → Loop: Send WhatsApp + Upsert Tracking
```

**Tabla Supabase:** mrapple_repair_tracking

---

### tech-whatsapp-notifications
**ID:** (buscar en n8n)

**Función:** Notifica a técnicos sobre asignaciones y transferencias.

---

### clientes-whatsapp-notifications
**ID:** (buscar en n8n)

**Función:** Notificaciones genéricas a clientes.

---

## Credenciales Usadas

| Nombre | Servicio | Uso |
|--------|----------|-----|
| Monday API | Monday.com | Queries y mutations |
| Supabase | Supabase | Base de datos |
| Evolution API | WhatsApp | Envío de mensajes |

---

## Evolution API

**URL:** https://evolutionapi-evolution-api.lx6zon.easypanel.host
**Instance:** tecnicos
**API Key:** 818CABBF7AAD-43EA-895E-9E9382255F46

**Endpoints usados:**
- `POST /message/sendText/tecnicos` - Enviar texto
- `POST /message/sendMedia/tecnicos` - Enviar imagen
- `POST /message/sendButtons/tecnicos` - Enviar botones

---

## Monday API

**URL:** https://api.monday.com/v2
**Board ID:** 324982306

**Mutations comunes:**
```graphql
# Cambiar status
mutation {
  change_simple_column_value(
    board_id: 324982306,
    item_id: "{item_id}",
    column_id: "status",
    value: "{index}"
  ) { id }
}

# Cambiar múltiples columnas
mutation {
  change_multiple_column_values(
    board_id: 324982306,
    item_id: {item_id},
    column_values: "{json_values}"
  ) { id }
}
```

---

## Supabase

**Project ID:** mhvzpetucfdjkvutmpen
**URL:** https://mhvzpetucfdjkvutmpen.supabase.co

**Tablas usadas:**
- `mrapple_repair_approvals` - Solicitudes de aprobación
- `mrapple_repair_tracking` - Tracking de heartbeats
- `mrapple_payment_flows` - Flujos de pago

---

## Troubleshooting

### Mensaje no llegó al cliente
1. Verificar teléfono en Monday (mínimo 10 dígitos)
2. Revisar ejecución del workflow en n8n
3. Verificar que el estado no esté en skipStatus
4. Confirmar horario laboral (9-19 COL) para heartbeat

### Estado no cambió automáticamente
1. Revisar ejecución en n8n
2. Verificar credenciales de Monday
3. Confirmar que el workflow está activo

### Error en aprobación
1. Verificar token no expirado (48h)
2. Revisar registro en mrapple_repair_approvals
3. Confirmar webhook está llegando
