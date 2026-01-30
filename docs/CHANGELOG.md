# Changelog

Historial de cambios del sistema de reparaciones Mister Manzana.

---

## [2026-01-30] - Fix Validación de Pagos v1.3

### Bug Reportado
Cuando Guille rechazaba un comprobante y el cliente enviaba una nueva foto, el sistema respondía:
> "No encontramos una reparación pendiente con tu número"

### Causa Raíz
El estado `mrapple_payment_flows.estado` quedaba en `receipt_received` después del rechazo, pero el workflow buscaba `awaiting_receipt`.

### Fixes Aplicados

#### 1. Estado se resetea al rechazar
**Nodo:** Update Rejected
```json
{
  "validation_status": "rejected",
  "validated_by": "guille",
  "estado": "awaiting_receipt",
  "receipt_url": null
}
```

#### 2. Query mejorado para fotos reenviadas
**Nodo:** Check Payment Flow
- Ahora busca: `awaiting_receipt` O `receipt_received` con `validation_status = pending`

#### 3. Flujo detecta reenvío de foto
**Nodo:** Determine Flow
- Agregada condición para `receipt_received + validation_status = pending + is_image`

#### 4. Función SQL actualizada
**Función:** `mrapple_set_payment_receipt`
- Ahora resetea `validation_status = 'pending'` al guardar nueva foto

#### 5. Retries agregados a 7 nodos HTTP
- Protección contra errores DNS (EAI_AGAIN)
- Config: `maxTries: 3, waitBetweenTries: 2000`

#### 6. Error handler corregido
**Nodo:** Download Image Evolution
- Conexión movida al output correcto (error)

#### 7. Clientes sin flujo activo
**Nuevos nodos:**
- Has Active Context?
- Send Monitoring Message
- Send Ezequiel Contact
- Respond Monitoring

**Mensaje:** "Este número es solo para seguimiento de servicios. Para atención escríbenos a: [vCard]"

#### 8. Conexiones duplicadas corregidas
**Nodo:** Needs Clarification?
- Lookup by Phone movido al output FALSE

### Workflow Actualizado
- **ID:** 05qEkASGvqER6SES
- **Nodos totales:** 63
- **Conexiones:** 51

---

## [2026-01-29] - Sistema de Notificaciones v2

### Workflows Creados

#### auto-revision-previa (LbyFGxwOQVxczE3w)
- Cambia automáticamente de "En oficina" (8) a "Revisión previa" (106) después de 20 minutos
- Corre cada 5 minutos

#### repair-heartbeat (JtdrCgOkJXxvL1GT)
- Envía mensaje de seguimiento a clientes con equipos en reparación prolongada
- Corre cada 30 minutos
- Solo en horario laboral (9-19 Colombia)
- Envía si no hay heartbeat previo o pasaron 4+ horas
- Usa tabla `mrapple_repair_tracking` para control

### Workflows Modificados

#### repair-status-notify (Yi3QA20FA3acUjCY)
- Actualizado mapa de mensajes con nuevos estados
- Agregado estado 107 (ENTREGADO) con mensaje de cierre
- Agregado estado 102 (GARANTÍA/LISTO)
- Removidos estados duplicados (10, 18 de notificación)
- Agregado estado 12 a skipStatus (usa heartbeat en lugar de notificación única)

#### repair-approval-notify
- Fix: Cambio automático de Monday cuando cliente aprueba/rechaza desde web
- Aprueba → status 12 + técnico JAFETH
- Rechaza → status 19
- Fix: Corregido typo 'JAFET' → 'JAFETH'
- Fix: Removido double encoding en mutation de rechazo

#### repair-approval-whatsapp-response (05qEkASGvqER6SES)
- Agregado cambio de Monday cuando cliente aprueba/rechaza vía WhatsApp
- Agregada notificación a Daniela (573017428749) cuando se valida pago

### App Técnicos

#### Botón "No Reparado" agregado
- Archivo: `/src/app/tecnico/page.tsx`
- Permite a técnicos marcar equipos que no se pudieron reparar
- Cambia estado a "no se pudo arreglar" (index 2)
- Ubicado en pestaña Clientes junto a "Reparado Oficina"

### Base de Datos

#### Nueva tabla: mrapple_repair_tracking
```sql
CREATE TABLE mrapple_repair_tracking (
  item_id TEXT PRIMARY KEY,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Columnas agregadas a mrapple_payment_flows
- validated_by TEXT
- validated_by_phone TEXT
- validated_at TIMESTAMPTZ
- validation_status TEXT ('pending', 'approved', 'rejected')
- rejection_reason TEXT
- reminder_sent_at TIMESTAMPTZ

### Estados Monday

#### Nuevo estado creado
- 107: ENTREGADO (creado manualmente en Monday UI)

#### Estados desactivados
- 10: por entregar (duplicado)
- 18: (como notificación, sigue activo para uso manual)

### Diccionario Oficial de Estados

| Index | Label | Función |
|-------|-------|---------|
| 8 | En oficina Local | Recepción |
| 106 | Revisión previa | Auto 20 min |
| 14 | en cotización 2P | Esperando aprobación |
| 12 | En reparación | Técnico trabajando |
| 105 | REPARADO OFICINA | Reparación exitosa |
| 2 | no se pudo arreglar | Reparación fallida |
| 7 | Por entregar - Pagar | Espera pago |
| 19 | POR ENTREGAR | Listo para recoger |
| 18 | NO REPARADO/ENTREGADO | Entrega sin reparación |
| 107 | ENTREGADO | Entrega con reparación |

---

## [2026-01-28] - Validación de Pagos v1.2

### Implementado
- Guille valida comprobantes con "1" (válido) o "2" (inválido)
- Notificaciones automáticas al cliente según validación
- Idempotencia por message_id
- Sistema de recordatorio a Guille (3+ horas sin respuesta)
- Notificación a Daniela cuando pago es validado

---

## [Anteriores] - Sistema Base

### Sistema de Aprobaciones
- Links de aprobación con token único
- Expiración 48h
- Aprobación vía web y WhatsApp
- Registro en Supabase

### Notificaciones por Estado
- WhatsApp automático en cada cambio de estado
- Integración con Evolution API
- Formato consistente con emoji y firma

### App Técnicos
- Interfaz web para técnicos
- Pestañas: Teléfonos, Clientes, Equipo
- Botones: Reparado Oficina, Transferir
