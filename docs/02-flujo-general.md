# Flujo General de Reparaciones

Este documento describe el flujo completo de una reparación en Mister Manzana, desde que el cliente entrega el equipo hasta que lo recoge.

---

## Resumen Visual

```
Cliente entrega
      │
      ▼
┌─────────────┐
│ En oficina  │ (8)
└──────┬──────┘
       │ 20 min (auto)
       ▼
┌─────────────────┐
│ Revisión previa │ (106)
└────────┬────────┘
         │ manual
         ▼
┌─────────────────┐
│ En cotización   │ (14)
│      2P         │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
 APRUEBA   RECHAZA
    │         │
    ▼         ▼
┌──────────┐  ┌───────────────┐
│   En     │  │ Por entregar  │ → Entrega → FIN
│reparación│  │     (19)      │
│   (12)   │  └───────────────┘
└────┬─────┘
     │
     ├────────────────┐
     ▼                ▼
  EXITOSA        NO ARREGLO
     │                │
     ▼                ▼
┌──────────┐    ┌──────────────┐
│ Reparado │    │No se pudo    │
│ oficina  │    │arreglar (2)  │
│  (105)   │    └──────┬───────┘
└────┬─────┘           │
     │                 ▼
     ▼           ┌───────────────┐
┌──────────────┐ │ Por entregar  │
│Por entregar -│ │     (19)      │
│   Pagar (7)  │ └───────┬───────┘
└──────┬───────┘         │
       │                 ▼
       ▼           ┌───────────────────┐
   💰 PAGO         │ NO REPARADO/      │
       │           │ ENTREGADO (18)    │
       ▼           └───────────────────┘
┌──────────────┐         FIN
│ Por entregar │
│     (19)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ENTREGADO   │ (107)
└──────────────┘
      FIN
```

---

## Paso a Paso Detallado

### 1. Recepción del equipo

- Daniela crea el item en Monday
- Estado inicial: **En oficina (8)**

**Cliente recibe:**
> "Tu equipo llegó a nuestra oficina..."

---

### 2. Revisión previa (automática)

- A los 20 minutos, el sistema cambia automáticamente a: **Revisión previa (106)**
- Workflow: `auto-revision-previa`

**Cliente recibe:**
> "Estamos revisando tu equipo para darte diagnóstico..."

---

### 3. Cotización

- Daniela cambia estado a: **En cotización 2P (14)**

**Sistema automáticamente:**
- Crea solicitud de aprobación en Supabase
- Genera token único con expiración 48h
- Envía WhatsApp con link de aprobación

**Cliente:**
- Recibe link
- Puede aprobar o rechazar (web o WhatsApp)

---

### 4. Decisión del cliente

#### Si aprueba:
- Estado automático → **En reparación (12)**
- Técnico asignado automáticamente (JAFETH)
- Cliente recibe confirmación

#### Si rechaza:
- Estado → **Por entregar (19)**
- Flujo termina (entrega sin reparación)

---

### 5. Reparación

- Técnico trabaja el equipo
- Estado: **En reparación (12)**

**Si se demora:**
- Cada 4 horas (en horario laboral 9-19) el cliente recibe:
> "Seguimos trabajando en tu equipo..."

- Workflow: `repair-heartbeat`

---

### 6. Resultado técnico

#### Si se reparó:
- Técnico cambia estado → **Reparado oficina (105)**
- Cliente recibe: "¡Tu equipo está reparado!"

#### Si no se pudo reparar:
- Técnico marca → **No se pudo arreglar (2)**
- Cliente recibe mensaje empático
- Flujo continúa a entrega sin cobro de reparación

---

### 7. Pago

- Daniela cambia a: **Por entregar - Pagar (7)**

**Cliente recibe:**
- Valor a pagar
- Datos de transferencia
- Instrucciones claras

---

### 8. Validación de pago

1. Cliente envía comprobante por WhatsApp
2. Sistema guarda imagen en Supabase Storage
3. Guille recibe la imagen

**Guille responde:**
- `1` → Pago válido
- `2` → Pago inválido

**Sistema automáticamente:**
- Actualiza Supabase
- Actualiza Monday → **Por entregar (19)**
- Notifica al cliente

---

### 9. Entrega

- Daniela entrega el equipo
- Cambia estado → **ENTREGADO (107)**

**Cliente recibe:**
> "Gracias por tu confianza..."

**Fin del flujo.**

---

## Flujos Alternativos

### Cliente rechaza cotización
```
En cotización (14) → Por entregar (19) → NO REPARADO/ENTREGADO (18)
```

### Equipo no se pudo reparar
```
En reparación (12) → No se pudo arreglar (2) → Por entregar (19) → NO REPARADO/ENTREGADO (18)
```

---

## Tiempos de Respuesta

| Transición | Tiempo | Tipo |
|------------|--------|------|
| En oficina → Revisión previa | 20 min | Automático |
| Link de aprobación | 48h expiración | - |
| Heartbeat en reparación | Cada 4h | Automático |
| Validación de pago | Inmediato | Manual (Guille) |

---

## Responsables

| Rol | Responsabilidades |
|-----|-------------------|
| **Daniela** | Crear items, cambiar estados, entregar equipos |
| **Técnicos** | Reparar, marcar resultado (éxito/fallo) |
| **Guille** | Validar pagos (1/2) |
| **Sistema** | Notificaciones, transiciones automáticas |
