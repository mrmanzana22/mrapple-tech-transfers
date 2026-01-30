# Estados en Monday.com

Este documento define los estados oficiales del tablero de reparaciones en Monday.com.

**Board ID:** 324982306
**Column ID:** status

---

## Estados Activos

| Index | Label | Descripción | Notifica al cliente |
|-------|-------|-------------|---------------------|
| 8 | En oficina Local | Cliente entrega equipo | ✓ |
| 106 | Revisión previa | Técnico revisando (auto 20 min) | ✓ |
| 14 | en cotización 2P | Esperando aprobación del cliente | ✓ (link) |
| 12 | En reparación | Técnico trabajando | ✗ (heartbeat cada 4h) |
| 105 | REPARADO OFICINA | Técnico terminó exitoso | ✓ |
| 2 | no se pudo arreglar | Técnico no pudo reparar | ✓ |
| 7 | Por entregar - Pagar | Espera pago del cliente | ✓ |
| 19 | POR ENTREGAR | Pagado, listo para recoger | ✓ |
| 18 | NO REPARADO/ENTREGADO | Entregado sin reparación | ✓ |
| 107 | ENTREGADO | Entregado con reparación exitosa | ✓ |
| 102 | GARANTÍA/LISTO | Equipo en garantía listo | ✓ |

---

## Estados Sin Notificación (skipStatus)

Estos estados no envían WhatsApp automático al cliente:

| Index | Label | Razón |
|-------|-------|-------|
| 14 | en cotización 2P | Tiene su propio workflow de aprobación |
| 12 | En reparación | Usa heartbeat cada 4h en lugar de notificación única |
| 1 | Listo | Deprecado |
| 3 | (vacío) | Desactivado |
| 4 | Realizar Factura | Interno |
| 5 | C REPUESTO | Interno |
| 6 | CUBA | Interno |
| 9 | SERGIO TALCO | Técnico |
| 13 | MIGUE | Técnico |
| 15 | JAFET | Técnico |
| 16 | DAVID FLOREZ | Técnico |
| 101 | CONFIRMAR COTIZACION | Deprecado |
| 103 | parte pago | Interno |
| 104 | REALIZAR CAMBIO | Interno |

---

## Estados Desactivados

| Index | Label | Razón |
|-------|-------|-------|
| 10 | por entregar | Duplicado de 19 |
| 3 | (vacío) | No usado |

---

## Transiciones Válidas

```
8  → 106 (auto 20 min)
106 → 14  (manual)
14  → 12  (cliente aprueba)
14  → 19  (cliente rechaza)
12  → 105 (reparación exitosa)
12  → 2   (no se pudo reparar)
105 → 7   (manual)
2   → 19  (manual)
7   → 19  (pago validado)
19  → 107 (entrega con reparación)
19  → 18  (entrega sin reparación)
```

---

## Columnas Relacionadas

| Column ID | Nombre | Tipo | Uso |
|-----------|--------|------|-----|
| status | Estado | Status | Estado principal del flujo |
| estado_1 | Técnico | Status | Técnico asignado (JAFETH, HAREC, etc.) |
| texto8 | Cliente Nombre | Text | Nombre del cliente |
| texto9 | Cliente Apellido | Text | Apellido del cliente |
| tel_fono | Teléfono | Phone | WhatsApp del cliente |
| texto | Tipo Reparación | Text | Descripción de la reparación |
| texto03 | IMEI/Serial | Text | Identificador del equipo |
| valor_a_cobrar | Valor | Number | Precio de la reparación |

---

## Técnicos Disponibles (estado_1)

| Index | Label |
|-------|-------|
| 0 | CARLOS |
| 1 | HAREC |
| 2 | JOCEBAN |
| 3 | FREDY |
| 4 | NORMAN |
| 6 | JAFETH |
| 7 | MARLON |
| 8 | SERGIO |
| 9 | IDEL |

---

## Notas Importantes

1. **Siempre usar index, no label** - Los labels pueden cambiar, los índices son estables
2. **Técnico auto-asignado** - Cuando cliente aprueba, se asigna automáticamente a JAFETH (index 6)
3. **No crear estados nuevos vía API** - Monday no lo permite, hay que crearlos manualmente en la UI
